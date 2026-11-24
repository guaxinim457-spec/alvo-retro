import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const Regras = require('../docs/jogo/regras.js');
const sorteioCentro = () => 0.5;

test('a dificuldade média cria a primeira onda e vida com valores esperados', () => {
  const estado = Regras.novaPartida('media', sorteioCentro);
  assert.equal(estado.vidas, 5);
  assert.equal(estado.onda, 1);
  assert.equal(estado.inimigos.length, 4);
  assert.ok(estado.inimigos.every((e) => e.faixa === 1));
});

test('alvo derrotado dá pontos e consome uma munição', () => {
  const estado = Regras.novaPartida('media', sorteioCentro);
  estado.inimigos[0].vida = 1;
  const proximo = Regras.disparar(estado, 1, sorteioCentro);
  assert.equal(proximo.pontos, Regras.PONTOS_POR_ALVO);
  assert.equal(proximo.municao, Regras.MUNICAO_MAXIMA - 1);
  assert.equal(proximo.inimigos.length, 3);
});

test('dano reduz vidas e zero vidas encerra em derrota', () => {
  const estado = Regras.novaPartida('media', sorteioCentro);
  const ferido = Regras.receberDano(estado, 2);
  assert.equal(ferido.vidas, 3);
  const derrotado = Regras.receberDano(Object.assign({}, ferido, { vidas: 1 }), 1);
  assert.equal(derrotado.vidas, 0);
  assert.equal(derrotado.terminou, true);
  assert.equal(derrotado.resultado, 'derrota');
});

test('recarga completa o pente depois do tempo e não ultrapassa o máximo', () => {
  let estado = Regras.novaPartida('media', sorteioCentro);
  estado.municao = 3;
  estado = Regras.iniciarRecarga(estado);
  assert.equal(estado.recarregando, 1400);
  for (let i = 0; i < 14; i++) estado = Regras.atualizar(estado, 100, sorteioCentro);
  assert.equal(estado.recarregando, 0);
  assert.equal(estado.municao, Regras.MUNICAO_MAXIMA);
});

test('munição vazia e disparo depois do fim não alteram o estado', () => {
  let estado = Regras.novaPartida('media', sorteioCentro);
  estado.municao = 0;
  assert.equal(Regras.disparar(estado, 1), estado);
  const fim = Object.assign({}, estado, { terminou: true, resultado: 'derrota' });
  assert.equal(Regras.disparar(fim, 1), fim);
});

test('cinco ondas limpas encerram a partida com vitória e 3.000 pontos máximos', () => {
  const estado = Regras.novaPartida('media', sorteioCentro);
  estado.onda = Regras.ONDAS;
  estado.inimigos = [{ id: 99, faixa: 1, distancia: 0.5, vida: 1, velocidade: 0.00001, fase: 'alvo' }];
  const final = Regras.disparar(estado, 1, sorteioCentro);
  assert.equal(final.resultado, 'vitoria');
  assert.equal(final.terminou, true);
  assert.equal(final.pontos, 100);
  assert.equal((4 + 5 + 6 + 7 + 8) * Regras.PONTOS_POR_ALVO, 3000);
});

test('casos de borda: dano não passa de zero, mira limita faixas e tiro erra sem dar pontos', () => {
  let estado = Regras.novaPartida('media', sorteioCentro);
  estado = Regras.receberDano(estado, 99);
  assert.equal(estado.vidas, 0);
  assert.equal(estado.terminou, true);
  const base = Regras.novaPartida('media', sorteioCentro);
  assert.equal(Regras.moverMira(base, 99, 8).miraFaixa, 2);
  assert.equal(Regras.moverMira(base, -99, -1).miraFaixa, 0);
  const tiro = Regras.disparar(base, 0, sorteioCentro);
  assert.equal(tiro.pontos, 0);
  assert.equal(tiro.municao, base.municao - 1);
});

test('a última faixa do sorteio é limitada e resistência progride por onda', () => {
  const estado = Regras.novaPartida('dificil', () => 1);
  assert.ok(estado.inimigos.every((e) => e.faixa === 2));
  const seguinte = Regras.novaPartida('media', sorteioCentro);
  seguinte.onda = 3;
  seguinte.inimigos = [{ id: 1, faixa: 1, distancia: .5, vida: 1, velocidade: 1, fase: 'alvo' }];
  const proximaOnda = Regras.disparar(seguinte, 1, sorteioCentro);
  assert.equal(proximaOnda.onda, 4);
  assert.equal(proximaOnda.inimigos[0].vida, 2);
});
