package br.com.novaroupa.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DescricaoLoteSanitizerTests {

    @Test
    void removeConteudoExecutavelEConservaTextoLegivel() {
        String descricao = "Retalhos <script>alert('xss')</script><img src=x onerror=alert(1)>"
                + "<b>algodão azul</b>";

        String sanitizada = DescricaoLoteSanitizer.sanitize(descricao);

        assertThat(sanitizada)
                .isEqualTo("Retalhos algodão azul")
                .doesNotContain("script", "onerror", "<", ">");
    }

    @Test
    void preservaDescricaoNula() {
        assertThat(DescricaoLoteSanitizer.sanitize(null)).isNull();
    }
}
