package br.com.novaroupa.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityConfigCorsTests {

    private final SecurityConfig securityConfig = new SecurityConfig();

    @Test
    void configuraSomenteOrigensExatasSeparadasPorVirgula() {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource(
                "http://localhost:4200, https://homolog.novaroupa.test");
        CorsConfiguration configuration = source.getCorsConfiguration(
                new MockHttpServletRequest("GET", "/api/lotes"));

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins())
                .containsExactly("http://localhost:4200", "https://homolog.novaroupa.test");
        assertThat(configuration.getAllowedMethods()).containsExactly("GET", "POST", "PUT", "PATCH",
                "DELETE", "OPTIONS");
        assertThat(configuration.getAllowCredentials()).isFalse();
    }

    @Test
    void rejeitaWildcardNaListaDeOrigens() {
        assertThatThrownBy(() -> securityConfig.corsConfigurationSource("http://localhost:4200,*"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("wildcard não é permitido");
    }
}
