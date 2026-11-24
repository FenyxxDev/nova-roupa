import { expect, test } from '@playwright/test';

test('login -> lote -> proposta -> aceite atualiza o histórico', async ({ browser, request }) => {
  const api = process.env.E2E_API_URL ?? 'http://localhost:8080/api';
  const login = async (username: string, password: string) => {
    const resposta = await request.post(`${api}/auth/login`, { data: { username, password } });
    expect(resposta.ok()).toBeTruthy();
    return (await resposta.json()) as { token: string };
  };

  const vendedor = await login('vendedor', 'vendedor-demo-123');
  const comprador = await login('comprador', 'comprador-demo-123');
  const marcador = `E2E ${Date.now()}`;
  const loteResposta = await request.post(`${api}/lotes`, {
    headers: { Authorization: `Bearer ${vendedor.token}` },
    data: {
      tipoTecido: 'ALGODAO', pesoKg: 24, metragemAproximada: 40,
      precoBaseKg: 8, corPredominante: 'Verde E2E', descricao: marcador,
      localizacao: 'São Paulo/SP',
    },
  });
  expect(loteResposta.status()).toBe(201);
  const lote = (await loteResposta.json()) as { id: number };

  const propostaResposta = await request.post(`${api}/propostas`, {
    headers: { Authorization: `Bearer ${comprador.token}` },
    data: { loteId: lote.id, mensagem: marcador, telefoneContato: '11999990000', valorOfertado: 100, quantidadeKgSolicitada: 10 },
  });
  expect(propostaResposta.status()).toBe(201);
  const proposta = (await propostaResposta.json()) as { id: number };

  const aceite = await request.patch(`${api}/propostas/${proposta.id}/status`, {
    headers: { Authorization: `Bearer ${vendedor.token}` },
    data: { status: 'ACEITA' },
  });
  expect(aceite.ok()).toBeTruthy();
  expect((await aceite.json()).status).toBe('ACEITA');

  const compradorPage = await browser.newPage();
  await compradorPage.goto('/login');
  await compradorPage.getByLabel('Usuário').fill('comprador');
  await compradorPage.getByLabel('Senha').fill('comprador-demo-123');
  await compradorPage.getByRole('button', { name: /entrar/i }).click();
  await expect(compradorPage).toHaveURL(/catalogo/, { timeout: 10000 });
  await compradorPage.goto('/perfil');
  const negociacao = compradorPage.getByRole('listitem').filter({ hasText: marcador });
  await expect(negociacao.getByText('Negociação com vendedor')).toBeVisible();
  await expect(negociacao.getByText('Aceita')).toBeVisible();
  await compradorPage.screenshot({ path: 'playwright-report/e2e-comprador-aceite.png', fullPage: true });
});
