package br.com.novaroupa.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notificacoes", indexes = @Index(name = "idx_notificacoes_destinatario_data", columnList = "destinatario_id,data_criacao"))
public class Notificacao {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "destinatario_id", nullable = false)
    private Usuario destinatario;
    @Column(nullable = false, length = 60) private String tipo;
    @Column(nullable = false, length = 500) private String mensagem;
    @Column(columnDefinition = "TEXT") private String dadosJson;
    @Column(nullable = false) private boolean lida;
    @Column(name = "data_criacao", nullable = false, updatable = false) private LocalDateTime dataCriacao;
    protected Notificacao() {}
    public Notificacao(Usuario destinatario, String tipo, String mensagem, String dadosJson) {
        this.destinatario = destinatario; this.tipo = tipo; this.mensagem = mensagem; this.dadosJson = dadosJson;
    }
    @PrePersist void inicializar() { if (dataCriacao == null) dataCriacao = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Usuario getDestinatario() { return destinatario; }
    public String getTipo() { return tipo; }
    public String getMensagem() { return mensagem; }
    public String getDadosJson() { return dadosJson; }
    public boolean isLida() { return lida; }
    public void setLida(boolean lida) { this.lida = lida; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
}
