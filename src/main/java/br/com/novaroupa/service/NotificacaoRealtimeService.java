package br.com.novaroupa.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificacaoRealtimeService {
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> conexoes = new ConcurrentHashMap<>();
    private final NotificacaoService persistencia;

    public NotificacaoRealtimeService() { this.persistencia = null; }

    @Autowired
    public NotificacaoRealtimeService(NotificacaoService persistencia) { this.persistencia = persistencia; }

    public SseEmitter conectar(String username) {
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        conexoes.computeIfAbsent(username, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        Runnable remover = () -> remover(username, emitter);
        emitter.onCompletion(remover);
        emitter.onTimeout(remover);
        emitter.onError(ignored -> remover.run());
        try {
            emitter.send(SseEmitter.event().name("connected").id(UUID.randomUUID().toString())
                    .data(Map.of("message", "Canal de notificações conectado")));
        } catch (IOException exception) {
            remover.run();
        }
        return emitter;
    }

    public void publicar(String username, String tipo, String mensagem, Map<String, Object> dados) {
        if (persistencia != null) {
            try { persistencia.publicar(username, tipo, mensagem, dados.toString()); }
            catch (RuntimeException ignored) { /* o SSE não deve falhar por indisponibilidade do feed */ }
        }
        var lista = conexoes.getOrDefault(username, new CopyOnWriteArrayList<>());
        for (SseEmitter emitter : lista) {
            try {
                emitter.send(SseEmitter.event().name(tipo).id(UUID.randomUUID().toString())
                        .data(Map.of("tipo", tipo, "mensagem", mensagem, "dados", dados)));
            } catch (IOException exception) {
                remover(username, emitter);
            }
        }
    }

    private void remover(String username, SseEmitter emitter) {
        var lista = conexoes.get(username);
        if (lista != null) {
            lista.remove(emitter);
            if (lista.isEmpty()) conexoes.remove(username, lista);
        }
    }
}
