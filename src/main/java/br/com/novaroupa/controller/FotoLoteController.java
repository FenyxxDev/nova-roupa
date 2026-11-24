package br.com.novaroupa.controller;

import br.com.novaroupa.dto.UploadFotosResponseDTO;
import br.com.novaroupa.service.FotoLoteStorageService;
import br.com.novaroupa.service.LoteRetalhoService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;

@RestController
@RequestMapping("/api")
public class FotoLoteController {
    private final FotoLoteStorageService storage;
    private final LoteRetalhoService lotes;

    public FotoLoteController(FotoLoteStorageService storage, LoteRetalhoService lotes) {
        this.storage = storage;
        this.lotes = lotes;
    }

    @PostMapping(value = "/lotes/{id}/fotos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('VENDEDOR', 'ADMIN')")
    public UploadFotosResponseDTO upload(@PathVariable Long id, @RequestParam("fotos") MultipartFile[] fotos,
                                         Authentication authentication) {
        var urls = storage.armazenar(fotos);
        try {
            return new UploadFotosResponseDTO(lotes.adicionarFotos(id, authentication.getName(), urls));
        } catch (RuntimeException exception) {
            storage.removerUrls(urls);
            throw exception;
        }
    }

    @GetMapping("/uploads/{nome}")
    public ResponseEntity<Resource> download(@PathVariable String nome) {
        var path = storage.localizar(nome);
        var resource = new FileSystemResource(path);
        String contentType;
        try { contentType = Files.probeContentType(path); } catch (Exception ignored) { contentType = null; }
        MediaType mediaType = contentType == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(contentType);
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "public,max-age=31536000,immutable")
                .contentType(mediaType).body(resource);
    }
}
