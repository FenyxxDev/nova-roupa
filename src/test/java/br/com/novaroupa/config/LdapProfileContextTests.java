package br.com.novaroupa.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/** Garante que o profile ldap arranca sem ambiguidade de AuthenticationManager (ARCH-01). */
@SpringBootTest
@ActiveProfiles({"test", "ldap"})
@TestPropertySource(properties = {
        "app.ldap.url=ldap://127.0.0.1:1389",
        "management.health.ldap.enabled=false"
})
class LdapProfileContextTests {

    @Autowired
    private ApplicationContext context;

    @Test
    void expoeUmUnicoAuthenticationManagerNoProfileLdap() {
        assertThat(context.getBeansOfType(AuthenticationManager.class)).hasSize(1);
    }
}
