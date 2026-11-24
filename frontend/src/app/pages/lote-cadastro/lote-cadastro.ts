import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FotoSelecionada, GaleriaFotos } from '../../components/galeria-fotos/galeria-fotos';
import { LoteCadastro as LoteCadastroPayload } from '../../models/lote-cadastro.model';
import { rotuloTecido } from '../../models/lote-rotulos';
import { TipoTecido } from '../../models/tipo-tecido.model';
import { LoteRetalhoService } from '../../services/lote-retalho.service';
import { NotificationService } from '../../services/notification.service';

/** Limites alinhados com as validações do `LoteCadastroDTO` no backend. */
export const PESO_MINIMO_KG = 1;
export const COR_MAXIMO_CARACTERES = 60;
export const LOCALIZACAO_MAXIMO_CARACTERES = 120;
export const DESCRICAO_MAXIMO_CARACTERES = 1000;

/** Nomes dos controlos do formulário de cadastro. */
export type CampoFormulario =
  | 'tipoTecido'
  | 'pesoKg'
  | 'metragemAproximada'
  | 'precoBaseKg'
  | 'corPredominante'
  | 'descricao'
  | 'localizacao';

/**
 * Publicação de um lote de retalhos (issues #31, #47 e #64).
 *
 * Formulário reativo com validação estrita: cada campo inválido mostra a sua
 * mensagem assim que é tocado, e o botão de publicar só submete com o formulário
 * válido. Em caso de sucesso o utilizador é levado para a vitrine com um toast.
 */
@Component({
  selector: 'app-lote-cadastro',
  imports: [ReactiveFormsModule, RouterLink, GaleriaFotos],
  templateUrl: './lote-cadastro.html',
  styleUrl: './lote-cadastro.css',
})
export class LoteCadastro {
  private readonly servico = inject(LoteRetalhoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Opções do seletor de tecido, na ordem do enum do backend. */
  readonly tecidos = Object.values(TipoTecido);
  readonly rotuloTecido = rotuloTecido;
  readonly corMaximo = COR_MAXIMO_CARACTERES;
  readonly descricaoMaximo = DESCRICAO_MAXIMO_CARACTERES;
  readonly localizacaoMaximo = LOCALIZACAO_MAXIMO_CARACTERES;

  readonly formulario = new FormGroup({
    tipoTecido: new FormControl<TipoTecido | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    pesoKg: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(PESO_MINIMO_KG)],
    }),
    metragemAproximada: new FormControl<number | null>(null, {
      validators: [Validators.min(0.1)],
    }),
    precoBaseKg: new FormControl<number | null>(null, {
      validators: [Validators.min(0.01)],
    }),
    corPredominante: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(COR_MAXIMO_CARACTERES)],
    }),
    descricao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(DESCRICAO_MAXIMO_CARACTERES)],
    }),
    localizacao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(LOCALIZACAO_MAXIMO_CARACTERES)],
    }),
  });

  /** `true` enquanto o `POST /api/lotes` está em curso. */
  readonly enviando = signal(false);
  /** Erro devolvido pelo backend ou pela rede. */
  readonly erroEnvio = signal<string | null>(null);
  private fotosSelecionadas: readonly FotoSelecionada[] = [];

  fotosAlteradas(fotos: readonly FotoSelecionada[]): void {
    this.fotosSelecionadas = fotos;
  }

  /**
   * Indica se o campo deve mostrar erro: só depois de tocado ou de uma tentativa
   * de submissão, para não marcar de vermelho um formulário ainda por preencher.
   */
  campoInvalido(nome: CampoFormulario): boolean {
    const campo = this.formulario.controls[nome];
    return campo.invalid && (campo.touched || campo.dirty);
  }

  /** Publica o lote quando o formulário é válido. */
  enviar(): void {
    if (this.enviando()) {
      return;
    }
    this.formulario.markAllAsTouched();
    this.erroEnvio.set(null);

    if (this.formulario.invalid) {
      this.notificacoes.aviso('Revise os campos destacados antes de publicar o lote.');
      return;
    }

    this.enviando.set(true);
    this.servico
      .cadastrar(this.paraPayload())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lote) => {
          const arquivos = this.fotosSelecionadas.map((foto) => foto.arquivo);
          if (arquivos.length === 0) {
            this.finalizarPublicacao(lote.id);
            return;
          }
          this.servico.enviarFotos(lote.id, arquivos).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => this.finalizarPublicacao(lote.id),
            error: () => {
              this.enviando.set(false);
              this.erroEnvio.set('O lote foi criado, mas o envio das fotos falhou. Tente novamente no detalhe do lote.');
              this.notificacoes.aviso('Lote publicado; o envio das fotos precisa de uma nova tentativa.');
            },
          });
        },
        error: (falha: HttpErrorResponse) => {
          this.enviando.set(false);
          this.erroEnvio.set(this.mensagemDeErro(falha));
          this.notificacoes.erro('Não foi possível publicar o lote.');
        },
      });
  }

  /** Converte o formulário no corpo aceito por `POST /api/lotes`. */
  private paraPayload(): LoteCadastroPayload {
    const valores = this.formulario.getRawValue();
    const descricao = valores.descricao.trim();
    return {
      tipoTecido: valores.tipoTecido as TipoTecido,
      pesoKg: valores.pesoKg as number,
      metragemAproximada: valores.metragemAproximada ?? undefined,
      precoBaseKg: valores.precoBaseKg ?? undefined,
      corPredominante: valores.corPredominante.trim(),
      descricao: descricao === '' ? undefined : descricao,
      localizacao: valores.localizacao.trim(),
    };
  }

  private finalizarPublicacao(id: number): void {
    this.enviando.set(false);
    this.notificacoes.sucesso(`Lote #${id} publicado com sucesso.`);
    void this.router.navigate(['/catalogo']);
  }

  private mensagemDeErro(falha: HttpErrorResponse): string {
    if (falha.status === 0) {
      return 'Não foi possível contactar o servidor. Verifique a ligação e tente novamente.';
    }
    if (falha.status === 400) {
      return 'O servidor recusou os dados do lote. Confira peso, cor e localização.';
    }
    if (falha.status === 401 || falha.status === 403) {
      return 'A sua sessão expirou ou o perfil não permite publicar lotes. Entre novamente.';
    }
    return 'Não foi possível publicar o lote agora. Tente novamente em instantes.';
  }
}
