package br.com.novaroupa.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mensagens_negociacao", indexes = @Index(name = "idx_mensagens_proposta_data", columnList = "proposta_id,data_criacao"))
public class MensagemNegociacao {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "proposta_id", nullable = false)
    private PropostaNegociacao proposta;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "autor_id", nullable = false)
    private Usuario autor;
    @Column(nullable = false, length = 2000)
    private String conteudo;
    @Column(name = "data_criacao", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;
    protected MensagemNegociacao() {}
    public MensagemNegociacao(PropostaNegociacao proposta, Usuario autor, String conteudo) {
        this.proposta = proposta; this.autor = autor; this.conteudo = conteudo;
    }
    @PrePersist void inicializar() { if (dataCriacao == null) dataCriacao = LocalDateTime.now(); }
    public Long getId() { return id; }
    public PropostaNegociacao getProposta() { return proposta; }
    public Usuario getAutor() { return autor; }
    public String getConteudo() { return conteudo; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
}
