package br.com.novaroupa.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FotoLoteStorageService {
    public static final long MAX_BYTES = 2L * 1024 * 1024;
    private static final int MAX_ARQUIVOS = 3;
    private final Path diretorio;

    public FotoLoteStorageService(@Value("${app.storage.dir:./data/uploads}") String diretorio) {
        this.diretorio = Path.of(diretorio).toAbsolutePath().normalize();
    }

    public List<String> armazenar(MultipartFile[] arquivos) {
        if (arquivos == null || arquivos.length == 0 || arquivos.length > MAX_ARQUIVOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie entre 1 e 3 fotos por lote");
        }
        List<Path> criados = new ArrayList<>();
        try {
            Files.createDirectories(diretorio);
            List<String> urls = new ArrayList<>();
            for (MultipartFile arquivo : arquivos) {
                validar(arquivo);
                String extensao = extensao(arquivo.getContentType());
                String nome = UUID.randomUUID() + extensao;
                Path destino = diretorio.resolve(nome).normalize();
                if (!destino.getParent().equals(diretorio)) throw new IOException("Caminho inválido");
                Files.copy(arquivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
                criados.add(destino);
                urls.add("/api/uploads/" + nome);
            }
            return urls;
        } catch (IOException exception) {
            criados.forEach(path -> { try { Files.deleteIfExists(path); } catch (IOException ignored) {} });
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível persistir as fotos", exception);
        }
    }

    public Path localizar(String nome) {
        if (!StringUtils.hasText(nome) || nome.contains("..") || nome.contains("/") || nome.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não encontrada");
        }
        Path arquivo = diretorio.resolve(nome).normalize();
        if (!arquivo.startsWith(diretorio) || !Files.exists(arquivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não encontrada");
        }
        return arquivo;
    }

    public void removerUrls(List<String> urls) {
        if (urls == null) return;
        for (String url : urls) {
            if (url == null || !url.startsWith("/api/uploads/")) continue;
            try {
                Files.deleteIfExists(localizar(url.substring("/api/uploads/".length())));
            } catch (IOException ignored) { }
        }
    }

    private void validar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty() || arquivo.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cada foto deve ter até 2 MB");
        }
        if (!List.of("image/jpeg", "image/png", "image/webp").contains(arquivo.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas JPEG, PNG ou WebP são aceitos");
        }
    }

    private String extensao(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato de foto inválido");
        };
    }
}
