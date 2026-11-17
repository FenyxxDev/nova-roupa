package br.com.novaroupa.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:target/test-extensao.db")
class LoginRateLimiterIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void blocksSixthConsecutiveInvalidLoginFromSameIpAndReturnsRetryAfter() throws Exception {
        RequestPostProcessor sameIp = request -> {
            request.setRemoteAddr("198.51.100.55");
            return request;
        };

        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/auth/login").with(sameIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"username":"vendedor","password":"senha-incorreta"}
                                    """))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/login").with(sameIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"vendedor","password":"senha-incorreta"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(
                        "Muitas tentativas de login. Tente novamente mais tarde."))
                .andExpect(result -> assertThat(result.getResponse().getHeader("Retry-After"))
                        .isNotBlank());
    }
}
