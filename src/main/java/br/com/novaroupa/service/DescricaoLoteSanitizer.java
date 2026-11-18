package br.com.novaroupa.service;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.jsoup.nodes.Document;

/** Remove conteúdo executável e marcação HTML de descrições fornecidas pelo usuário. */
public final class DescricaoLoteSanitizer {

    private DescricaoLoteSanitizer() {
    }

    /** Mantém somente texto simples; conteúdo de script e estilo é descartado por completo. */
    public static String sanitize(String descricao) {
        if (descricao == null) {
            return null;
        }
        Document documento = Jsoup.parseBodyFragment(descricao);
        documento.select("script, style").remove();
        return Jsoup.clean(documento.body().html(), Safelist.none());
    }
}
