import { TestBed } from '@angular/core/testing';
import { DURACAO_PADRAO_MS, NotificationService } from './notification.service';

describe('NotificationService', () => {
  let servico: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    servico = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    servico.limpar();
    vi.useRealTimers();
  });

  it('publica um toast de sucesso', () => {
    servico.sucesso('Lote publicado');
    expect(servico.notificacoes().length).toBe(1);
    expect(servico.notificacoes()[0].tipo).toBe('sucesso');
    expect(servico.notificacoes()[0].mensagem).toBe('Lote publicado');
  });

  it('remove o toast automaticamente após o tempo padrão', () => {
    servico.aviso('Atenção');
    expect(servico.notificacoes().length).toBe(1);

    vi.advanceTimersByTime(DURACAO_PADRAO_MS - 1);
    expect(servico.notificacoes().length).toBe(1);

    vi.advanceTimersByTime(1);
    expect(servico.notificacoes().length).toBe(0);
  });

  it('permite dispensar manualmente antes do timeout', () => {
    const id = servico.erro('Falhou');
    servico.dispensar(id);
    expect(servico.notificacoes().length).toBe(0);
  });

  it('mantém vários toasts e limpa todos', () => {
    servico.sucesso('a');
    servico.info('b');
    expect(servico.notificacoes().length).toBe(2);
    servico.limpar();
    expect(servico.notificacoes().length).toBe(0);
  });

  it('respeita duração personalizada', () => {
    servico.info('curto', 1000);
    vi.advanceTimersByTime(1000);
    expect(servico.notificacoes().length).toBe(0);
  });
});
