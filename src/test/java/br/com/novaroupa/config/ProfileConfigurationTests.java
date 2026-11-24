package br.com.novaroupa.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Garante que cada profile mantém o isolamento de configuração definido na ARCH-01. */
class ProfileConfigurationTests {

    private PropertySource<?> carregar(String recurso) throws IOException {
        List<PropertySource<?>> fontes = new YamlPropertySourceLoader()
                .load(recurso, new ClassPathResource(recurso));
        assertThat(fontes).hasSize(1);
        return fontes.get(0);
    }

    @Test
    void baseNaoDefineDatasourceNemProfileAtivo() throws IOException {
        PropertySource<?> base = carregar("application.yml");

        assertThat(base.getProperty("spring.profiles.default")).isEqualTo("dev");
        assertThat(base.getProperty("spring.profiles.active")).isNull();
        assertThat(base.getProperty("spring.datasource.url")).isNull();
        assertThat(base.getProperty("spring.jpa.hibernate.ddl-auto")).isNull();
    }

    @Test
    void devUsaSqliteLocalComMocks() throws IOException {
        PropertySource<?> dev = carregar("application-dev.yml");

        assertThat(dev.getProperty("spring.datasource.url")).isEqualTo("${DATABASE_URL:jdbc:sqlite:extensao.db}");
        assertThat(dev.getProperty("spring.datasource.driver-class-name")).isEqualTo("org.sqlite.JDBC");
        assertThat(dev.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("update");
        assertThat(dev.getProperty("spring.sql.init.mode")).isEqualTo("always");
        assertThat(dev.getProperty("management.health.ldap.enabled")).isEqualTo(false);
        assertThat(dev.getProperty("app.jwt.secret")).isNull();
    }

    @Test
    void testUsaSqliteEmMemoria() throws IOException {
        PropertySource<?> test = carregar("application-test.yml");

        assertThat(test.getProperty("spring.datasource.url").toString()).contains("mode=memory");
        assertThat(test.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("create-drop");
        assertThat(test.getProperty("management.health.mail.enabled")).isEqualTo(false);
    }

    @Test
    void prodExigeVariaveisDeAmbienteSemPredefinicao() throws IOException {
        PropertySource<?> prod = carregar("application-prod.yml");

        assertThat(prod.getProperty("spring.datasource.url")).isEqualTo("${SPRING_DATASOURCE_URL}");
        assertThat(prod.getProperty("app.jwt.secret")).isEqualTo("${JWT_SECRET}");
        assertThat(prod.getProperty("app.cors.allowed-origins")).isEqualTo("${CORS_ALLOWED_ORIGINS}");
        assertThat(prod.getProperty("app.ldap.url")).isEqualTo("${LDAP_URL}");
    }

    @Test
    void prodNaoTrazSegredosNemMockDeAutenticacao() throws IOException {
        PropertySource<?> prod = carregar("application-prod.yml");

        assertThat(prod.getProperty("spring.datasource.password")).isNull();
        assertThat(prod.getProperty("spring.mail.password")).isNull();
        assertThat(prod.getProperty("app.jwt.secret").toString()).startsWith("${");
        assertThat(prod.getProperty("spring.profiles.active")).isNull();
    }

    @Test
    void ldapAtivaSondaDoDiretorio() throws IOException {
        PropertySource<?> ldap = carregar("application-ldap.yml");

        assertThat(ldap.getProperty("management.health.ldap.enabled")).isEqualTo(true);
    }
}
