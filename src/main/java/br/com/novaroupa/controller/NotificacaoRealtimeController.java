package br.com.novaroupa.controller;

import br.com.novaroupa.service.NotificacaoRealtimeService;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoRealtimeController {
    private final NotificacaoRealtimeService service;

    public NotificacaoRealtimeController(NotificacaoRealtimeService service) {
        this.service = service;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Authentication authentication) {
        return service.conectar(authentication.getName());
    }
}
