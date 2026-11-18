import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { formatarPeso, rotuloTecido } from '../../models/lote-rotulos';
import {
  LoteNegociavel,
  Proposta,
  PropostaCadastro,
  formatarReais,
} from '../../models/proposta.model';
import { NotificationService } from '../../services/notification.service';
import { PropostaService } from '../../services/proposta.service';

/** Valor mínimo aceito pelo backend (`@Positive` em `valorOfertado`). */
export const VALOR_MINIMO_OFERTA = 0.01;
/** Quantidade mínima solicitada, em kg (`@Positive` em `quantidadeKgSolicitada`). */
export const QUANTIDADE_MINIMA_KG = 0.1;
/** Limites de texto alinhados com o `PropostaCadastroDTO`. */
export const MENSAGEM_MAXIMO_CARACTERES = 2000;
export const TELEFONE_MAXIMO_CARACTERES = 30;

/**
 * Modal de envio de proposta e de contraproposta (issues #33, #48 e #65).
 *
 * Recebe o lote em negociação e, opcionalmente, a proposta que está a ser
 * respondida. Como o backend não tem endpoint de contraproposta, responder
 * equivale a enviar uma nova proposta sobre o mesmo lote com o valor revisto e
 * a justificativa na mensagem — o histórico fica na página de propostas.
 */
@Component({
  selector: 'app-proposta-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './proposta-modal.html',
  styleUrl: './proposta-modal.css',
})
export class PropostaModal implements OnInit {
  private readonly servico = inject(PropostaService);
  private readonly notificacoes = inject(NotificationService);

  /** Lote em negociação (basta o subconjunto usado na apresentação). */
  readonly lote = input.required<LoteNegociavel>();
  /** Proposta a responder; quando presente, o modal abre em modo contraproposta. */
  readonly propostaOriginal = input<Proposta | null>(null);

  /** Pedido de fecho emitido pelo botão, pelo `Esc` ou pelo fundo. */
  readonly fechar = output<void>();
  /** Proposta criada com sucesso. */
  readonly enviada = output<Proposta>();

  private readonly primeiroCampo = viewChild<ElementRef<HTMLInputElement>>('campoValor');

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly rotuloTecido = rotuloTecido;
  readonly formatarPeso = formatarPeso;
  readonly formatarReais = formatarReais;

  readonly formulario = new FormGroup({
    valorOfertado: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(VALOR_MINIMO_OFERTA),
    ]),
    quantidadeKgSolicitada: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(QUANTIDADE_MINIMA_KG),
    ]),
    mensagem: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MENSAGEM_MAXIMO_CARACTERES)],
    }),
    telefoneContato: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(TELEFONE_MAXIMO_CARACTERES)],
    }),
  });

  /** Título e ação mudam conforme o modal está a propor ou a contrapor. */
  readonly modo = computed(() =>
    this.propostaOriginal() === null ? 'proposta' : 'contraproposta',
  );

  constructor() {
    // O limite de quantidade depende do peso disponível no lote; recalcula-se
    // sempre que o lote em negociação muda.
    effect(() => {
      const peso = this.lote().pesoKg;
      const controlo = this.formulario.controls.quantidadeKgSolicitada;
      controlo.setValidators([
        Validators.required,
        Validators.min(QUANTIDADE_MINIMA_KG),
        Validators.max(peso),
      ]);
      controlo.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    const original = this.propostaOriginal();
    if (original) {
      this.formulario.patchValue({
        valorOfertado: original.valorOfertado,
        quantidadeKgSolicitada: original.quantidadeKg,
        mensagem: '',
        telefoneContato: original.telefoneContato ?? '',
      });
    }
    this.primeiroCampo()?.nativeElement.focus();
  }

  /** `Esc` fecha o modal, como manda a convenção de diálogos. */
  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    this.fechar.emit();
  }

  /** Clique no fundo fecha; clique dentro da caixa não propaga. */
  aoClicarFundo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.fechar.emit();
    }
  }

  /** Indica se um campo deve mostrar a mensagem de erro respetiva. */
  campoInvalido(campo: keyof typeof this.formulario.controls, erro: string): boolean {
    const controlo = this.formulario.controls[campo];
    return controlo.invalid && (controlo.touched || controlo.dirty) && controlo.hasError(erro);
  }

  /** Monta o payload aceito por `POST /api/propostas`. */
  paraPayload(): PropostaCadastro {
    const valores = this.formulario.getRawValue();
    const telefone = valores.telefoneContato.trim();
    return {
      loteId: this.lote().id,
      mensagem: valores.mensagem.trim(),
      valorOfertado: Number(valores.valorOfertado),
      quantidadeKgSolicitada: Number(valores.quantidadeKgSolicitada),
      ...(telefone ? { telefoneContato: telefone } : {}),
    };
  }

  /** Valida e envia a proposta; em sucesso avisa a página e fecha o modal. */
  enviar(): void {
    this.erro.set(null);
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.erro.set('Revise os campos destacados antes de enviar.');
      return;
    }
    this.enviando.set(true);
    this.servico.enviar(this.paraPayload()).subscribe({
      next: (proposta) => {
        this.enviando.set(false);
        this.notificacoes.sucesso(
          this.modo() === 'contraproposta'
            ? 'Contraproposta enviada ao comprador.'
            : 'Proposta enviada ao vendedor.',
        );
        this.enviada.emit(proposta);
        this.fechar.emit();
      },
      error: (falha: HttpErrorResponse) => {
        this.enviando.set(false);
        this.erro.set(this.mensagemDeErro(falha));
      },
    });
  }

  private mensagemDeErro(falha: HttpErrorResponse): string {
    if (falha.status === 0) {
      return 'Não foi possível contactar o servidor. Verifique a ligação e tente novamente.';
    }
    if (falha.status === 400) {
      return 'O backend recusou os dados enviados. Confirme o valor, a quantidade e a mensagem.';
    }
    if (falha.status === 401 || falha.status === 403) {
      return 'A sua sessão não permite enviar propostas. Entre novamente como comprador.';
    }
    return 'Não foi possível enviar a proposta agora. Tente novamente em instantes.';
  }
}
