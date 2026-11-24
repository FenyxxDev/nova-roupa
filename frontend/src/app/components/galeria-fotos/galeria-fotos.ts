import { Component, ElementRef, computed, output, signal, viewChild } from '@angular/core';

/** Máximo de imagens aceites pelo cadastro (issue #72). */
export const MAX_FOTOS = 3;

/** Tamanho máximo por imagem: 2 MB. */
export const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024;

/** Formatos aceites, alinhados com o que o backend serve (`<img>` no browser). */
export const TIPOS_ACEITOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** Fotografia escolhida pelo utilizador, já validada e pronta para pré-visualizar. */
export interface FotoSelecionada {
  readonly id: number;
  readonly nome: string;
  readonly tamanho: number;
  readonly tipo: string;
  readonly url: string;
  readonly arquivo: File;
}

/**
 * Galeria de amostras do lote (issue #72).
 *
 * Aceita até 3 imagens JPEG/PNG/WebP de 2 MB por ficheiro, por seleção ou por
 * arrastar e soltar, e mostra miniaturas com remoção individual. As validações
 * são feitas no cliente antes de qualquer submissão.
 *
 * Nota: as imagens ficam apenas em memória (pré-visualização). O backend aceita
 * `fotosUrls` como texto de até 2000 caracteres e ainda não expõe endpoint de
 * upload de binários, pelo que nenhum ficheiro é enviado no `POST /api/lotes`.
 */
@Component({
  selector: 'app-galeria-fotos',
  templateUrl: './galeria-fotos.html',
  styleUrl: './galeria-fotos.css',
})
export class GaleriaFotos {
  private readonly entradaArquivos =
    viewChild.required<ElementRef<HTMLInputElement>>('entradaArquivos');
  private proximoId = 1;

  /** Fotografias atualmente na galeria. */
  readonly fotos = signal<readonly FotoSelecionada[]>([]);
  /** Mensagem de validação do último ficheiro rejeitado. */
  readonly erro = signal<string | null>(null);
  /** `true` enquanto o utilizador arrasta ficheiros sobre a área de envio. */
  readonly arrastando = signal(false);

  /** Quantidade de imagens na galeria. */
  readonly quantidade = computed(() => this.fotos().length);
  /** Indica se ainda há espaço para mais imagens. */
  readonly podeAdicionar = computed(() => this.fotos().length < MAX_FOTOS);
  /** Quantas imagens ainda cabem. */
  readonly restantes = computed(() => MAX_FOTOS - this.fotos().length);

  /** Emitido sempre que a lista de fotografias muda. */
  readonly fotosAlteradas = output<readonly FotoSelecionada[]>();

  readonly maxFotos = MAX_FOTOS;
  readonly tiposAceitos = TIPOS_ACEITOS.join(', ');

  /** Abre o seletor nativo de ficheiros. */
  abrirSeletor(): void {
    this.entradaArquivos().nativeElement.click();
  }

  /** Trata a escolha pelo seletor nativo. */
  aoSelecionar(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.adicionar(entrada.files);
    // Limpar permite escolher o mesmo ficheiro outra vez depois de o remover.
    entrada.value = '';
  }

  /** Destaca a área de envio durante o arrasto. */
  aoArrastarSobre(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(true);
  }

  /** Remove o destaque quando o ficheiro sai da área. */
  aoSairDoArrasto(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(false);
  }

  /** Trata o drop de ficheiros. */
  aoSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(false);
    this.adicionar(evento.dataTransfer?.files ?? null);
  }

  /** Remove uma fotografia da galeria. */
  remover(id: number): void {
    const alvo = this.fotos().find((foto) => foto.id === id);
    if (alvo) {
      this.libertarUrl(alvo.url);
    }
    this.fotos.set(this.fotos().filter((foto) => foto.id !== id));
    this.erro.set(null);
    this.fotosAlteradas.emit(this.fotos());
  }

  /** Esvazia a galeria (usado depois de publicar o lote). */
  limpar(): void {
    this.fotos().forEach((foto) => this.libertarUrl(foto.url));
    this.fotos.set([]);
    this.erro.set(null);
    this.fotosAlteradas.emit(this.fotos());
  }

  /**
   * Valida e acrescenta ficheiros à galeria.
   *
   * Cada ficheiro passa por três verificações, na ordem em que o utilizador as
   * compreende: formato, tamanho e limite de quantidade.
   *
   * Aceita `FileList` (seletor nativo e drag and drop) ou um array simples, o
   * que mantém o método testável em ambientes sem `DataTransfer`.
   */
  adicionar(ficheiros: FileList | readonly File[] | null): void {
    if (!ficheiros || ficheiros.length === 0) {
      return;
    }

    const aceites: FotoSelecionada[] = [];
    let mensagem: string | null = null;

    for (const ficheiro of Array.from(ficheiros)) {
      if (this.fotos().length + aceites.length >= MAX_FOTOS) {
        mensagem = `Pode enviar no máximo ${MAX_FOTOS} imagens.`;
        break;
      }
      if (!TIPOS_ACEITOS.includes(ficheiro.type)) {
        mensagem = `"${ficheiro.name}" não é uma imagem JPEG, PNG ou WebP.`;
        continue;
      }
      if (ficheiro.size > TAMANHO_MAXIMO_BYTES) {
        mensagem = `"${ficheiro.name}" tem mais de 2 MB. Escolha uma imagem menor.`;
        continue;
      }
      aceites.push({
        id: this.proximoId++,
        nome: ficheiro.name,
        tamanho: ficheiro.size,
        tipo: ficheiro.type,
        url: this.criarUrl(ficheiro),
        arquivo: ficheiro,
      });
    }

    if (aceites.length > 0) {
      this.fotos.set([...this.fotos(), ...aceites]);
      this.fotosAlteradas.emit(this.fotos());
    }
    this.erro.set(mensagem);
  }

  /** Formata o tamanho em KB/MB para a lista de miniaturas. */
  formatarTamanho(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  /** Cria a URL de pré-visualização, tolerando ambientes sem `createObjectURL`. */
  private criarUrl(ficheiro: File): string {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return URL.createObjectURL(ficheiro);
    }
    return '';
  }

  /** Liberta a URL de pré-visualização quando a fotografia sai da galeria. */
  private libertarUrl(url: string): void {
    if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
  }
}
