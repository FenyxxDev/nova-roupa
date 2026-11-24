package br.com.novaroupa.config;

import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.TipoTecido;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.LoteRetalhoRepository;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Massa de dados segura e idempotente para a demonstração local do MVP. */
@Configuration
@Profile("dev")
public class DemoSeedConfiguration {
    @Bean
    ApplicationRunner demoSeed(UsuarioRepository usuarios, LoteRetalhoRepository lotes,
                               PropostaNegociacaoRepository propostas,
                               @Value("${app.demo.seed.enabled:true}") boolean habilitado,
                               @Value("${app.storage.dir:./data/uploads}") String diretorioFotos) {
        return args -> {
            if (!habilitado) return;
            Usuario vendedor = usuario(usuarios, "vendedor", TipoPerfil.VENDEDOR, "vendedor@novaroupa.local");
            Usuario comprador = usuario(usuarios, "comprador", TipoPerfil.COMPRADOR, "comprador@novaroupa.local");
            usuario(usuarios, "admin", TipoPerfil.ADMIN, "admin@novaroupa.local");

            LoteRetalho algodao = lote(lotes, vendedor, TipoTecido.ALGODAO, 120.0,
                    "Azul marinho", "São Paulo/SP", "Retalhos de algodão selecionados para novas peças.", 8.50);
            LoteRetalho jeans = lote(lotes, vendedor, TipoTecido.JEANS, 85.0,
                    "Índigo", "São Paulo/SP", "Jeans reaproveitável com diferentes lavagens.", 12.00);
            LoteRetalho mistos = lote(lotes, vendedor, TipoTecido.RETALHOS_MISTOS, 60.0,
                    "Colorido", "Campinas/SP", "Mistura de sobras para oficinas e protótipos.", 5.00);

            foto(algodao, "demo-algodao.svg", diretorioFotos, "#315c72", "Algodão circular");
            foto(jeans, "demo-jeans.svg", diretorioFotos, "#1d4e89", "Jeans reaproveitado");
            foto(mistos, "demo-mistos.svg", diretorioFotos, "#9c6644", "Retalhos mistos");
            lotes.saveAll(java.util.List.of(algodao, jeans, mistos));

            proposta(propostas, algodao, comprador, 8.50, 20.0, StatusPropostaNegociacao.PENDENTE,
                    "Tenho interesse para uma coleção de upcycling.");
            proposta(propostas, jeans, comprador, 11.50, 15.0, StatusPropostaNegociacao.CONCLUIDA,
                    "Lote usado na oficina piloto de moda circular.");
        };
    }

    private Usuario usuario(UsuarioRepository repositorio, String username, TipoPerfil perfil, String email) {
        Usuario usuario = repositorio.findByUsername(username).orElseGet(() -> new Usuario(username, perfil));
        usuario.setEmail(email);
        usuario.setNomeCompleto(username.equals("vendedor") ? "Vendedor Demo" : username.equals("comprador") ? "Comprador Demo" : "Administrador Demo");
        usuario.setTipoPerfil(perfil);
        return repositorio.save(usuario);
    }

    private LoteRetalho lote(LoteRetalhoRepository repositorio, Usuario vendedor, TipoTecido tipo, double peso, String cor, String local, String descricao, double preco) {
        return repositorio.findAll().stream().filter(item -> descricao.equals(item.getDescricao())).findFirst().orElseGet(() -> {
            LoteRetalho lote = new LoteRetalho(vendedor, tipo, peso, cor, local);
            lote.setDescricao(descricao);
            lote.setPrecoBaseKg(preco);
            lote.setMetragemAproximada(peso * 1.7);
            return repositorio.save(lote);
        });
    }

    private void proposta(PropostaNegociacaoRepository repositorio, LoteRetalho lote, Usuario comprador,
                          double valor, double quantidade, StatusPropostaNegociacao status, String mensagem) {
        boolean existe = repositorio.findByComprador(comprador).stream()
                .anyMatch(item -> item.getLote().getId().equals(lote.getId()) && item.getMensagem().equals(mensagem));
        if (!existe) {
            PropostaNegociacao proposta = new PropostaNegociacao(lote, comprador, mensagem,
                    "11999990000", valor, quantidade);
            proposta.setStatus(status);
            repositorio.save(proposta);
        }
    }

    private void foto(LoteRetalho lote, String nome, String diretorio, String cor, String titulo) throws Exception {
        Path pasta = Path.of(diretorio).toAbsolutePath().normalize();
        Files.createDirectories(pasta);
        Path arquivo = pasta.resolve(nome);
        if (!Files.exists(arquivo)) {
            String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"500\"><rect width=\"100%\" height=\"100%\" fill=\"" + cor + "\"/><circle cx=\"650\" cy=\"130\" r=\"90\" fill=\"#f2cc8f\" opacity=\".8\"/><text x=\"55\" y=\"260\" fill=\"white\" font-family=\"Arial\" font-size=\"48\" font-weight=\"bold\">" + titulo + "</text><text x=\"58\" y=\"315\" fill=\"white\" font-family=\"Arial\" font-size=\"24\">Nova Roupa · lote demonstrativo</text></svg>";
            Files.writeString(arquivo, svg, StandardCharsets.UTF_8);
        }
        String url = "/api/uploads/" + nome;
        if (lote.getFotosUrls() == null || !lote.getFotosUrls().contains(url)) lote.setFotosUrls(url);
    }
}
