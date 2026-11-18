import { TestBed } from '@angular/core/testing';
import { GaleriaFotos, MAX_FOTOS, TAMANHO_MAXIMO_BYTES } from './galeria-fotos';

/** Cria um ficheiro de imagem com o tipo e o tamanho pedidos. */
function imagem(nome = 'amostra.jpg', tipo = 'image/jpeg', bytes = 1024): File {
  return new File([new Uint8Array(bytes)], nome, { type: tipo });
}

describe('GaleriaFotos', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GaleriaFotos] }).compileComponents();
  });

  it('aceita uma imagem válida e cria a miniatura', () => {
    const fixture = TestBed.createComponent(GaleriaFotos);
    const galeria = fixture.componentInstance;

    galeria.adicionar([imagem('jeans.jpg')]);

    expect(galeria.fotos().length).toBe(1);
    expect(galeria.fotos()[0].nome).toBe('jeans.jpg');
    expect(galeria.erro()).toBeNull();
    expect(galeria.podeAdicionar()).toBe(true);
  });

  it('rejeita formatos fora de JPEG, PNG e WebP', () => {
    const fixture = TestBed.createComponent(GaleriaFotos);
    const galeria = fixture.componentInstance;

    galeria.adicionar([imagem('desenho.gif', 'image/gif')]);

    expect(galeria.fotos().length).toBe(0);
    expect(galeria.erro()).toContain('JPEG, PNG ou WebP');
  });

  it('rejeita imagens acima de 2 MB', () => {
    const fixture = TestBed.createComponent(GaleriaFotos);
    const galeria = fixture.componentInstance;

    galeria.adicionar([imagem('grande.png', 'image/png', TAMANHO_MAXIMO_BYTES + 1)]);

    expect(galeria.fotos().length).toBe(0);
    expect(galeria.erro()).toContain('2 MB');
  });

  it('limita a galeria a três imagens', () => {
    const fixture = TestBed.createComponent(GaleriaFotos);
    const galeria = fixture.componentInstance;

    galeria.adicionar([
      imagem('a.jpg'),
      imagem('b.jpg'),
      imagem('c.jpg'),
      imagem('d.jpg'),
    ]);

    expect(galeria.fotos().length).toBe(MAX_FOTOS);
    expect(galeria.podeAdicionar()).toBe(false);
    expect(galeria.erro()).toContain('no máximo 3 imagens');
  });

  it('remove uma imagem da galeria', () => {
    const fixture = TestBed.createComponent(GaleriaFotos);
    const galeria = fixture.componentInstance;

    galeria.adicionar([imagem('a.jpg'), imagem('b.jpg')]);
    const alvo = galeria.fotos()[0];
    galeria.remover(alvo.id);

    expect(galeria.fotos().length).toBe(1);
    expect(galeria.fotos().some((foto) => foto.id === alvo.id)).toBe(false);
  });

  it('formata o tamanho em KB e MB', () => {
    const fixture = TestBed.createComponent(GaleriaFotos);
    const galeria = fixture.componentInstance;

    expect(galeria.formatarTamanho(512 * 1024)).toBe('512 KB');
    expect(galeria.formatarTamanho(1.5 * 1024 * 1024)).toBe('1,5 MB');
  });
});
