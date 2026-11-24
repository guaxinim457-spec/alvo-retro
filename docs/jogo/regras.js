/* Regras puras de Further and more. O sorteio sempre entra como argumento. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Regras = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ONDAS = 5;
  const MUNICAO_MAXIMA = 8;
  const PONTOS_POR_ALVO = 100;
  const PERFIS = {
    facil: { vidas: 6, quantidade: 2, velocidade: 0.000018, resistencia: 1 },
    media: { vidas: 5, quantidade: 3, velocidade: 0.000027, resistencia: 1 },
    dificil: { vidas: 4, quantidade: 4, velocidade: 0.000038, resistencia: 2 }
  };
  const limitar = (n, min, max) => Math.max(min, Math.min(max, n));
  const perfil = (dificuldade) => PERFIS[dificuldade] || PERFIS.media;

  function criarOnda(estado, sorteio) {
    const sorte = typeof sorteio === 'function' ? sorteio : () => 0.5;
    const p = perfil(estado.dificuldade);
    const quantidade = estado.onda + p.quantidade;
    const inimigos = [];
    for (let i = 0; i < quantidade; i++) {
      const valor = Number(sorte());
      inimigos.push({
        id: estado.proximoId++,
        faixa: limitar(Math.floor((Number.isFinite(valor) ? valor : 0) * 3), 0, 2),
        distancia: 1,
        vida: p.resistencia + Math.floor((estado.onda - 1) / 2),
        velocidade: p.velocidade * (1 + (estado.onda - 1) * 0.12),
        fase: (i % 2) ? 'alvo' : 'espantalho'
      });
    }
    estado.inimigos = inimigos;
  }

  function novaPartida(dificuldade, sorteio) {
    const d = Object.hasOwn(PERFIS, dificuldade) ? dificuldade : 'media';
    const estado = {
      dificuldade: d, vidas: perfil(d).vidas, municao: MUNICAO_MAXIMA,
      recarregando: 0, pontos: 0, onda: 1, inimigos: [], terminou: false,
      resultado: '', proximoId: 1, miraFaixa: 1, miraAltura: 0.5, dano: 0
    };
    criarOnda(estado, sorteio);
    return estado;
  }

  function moverMira(estado, faixa, altura) {
    if (estado.terminou) return estado;
    return Object.assign({}, estado, {
      miraFaixa: limitar(Math.round(faixa), 0, 2),
      miraAltura: limitar(Number(altura), 0, 1)
    });
  }

  function iniciarRecarga(estado) {
    if (estado.terminou || estado.recarregando > 0 || estado.municao === MUNICAO_MAXIMA) return estado;
    return Object.assign({}, estado, { recarregando: 1400 });
  }

  function disparar(estado, faixa, sorteio) {
    if (estado.terminou || estado.recarregando > 0 || estado.municao <= 0) return estado;
    let proximo = Object.assign({}, estado, { municao: estado.municao - 1, inimigos: estado.inimigos.slice() });
    const f = faixa === undefined ? estado.miraFaixa : limitar(Math.round(faixa), 0, 2);
    const alvo = proximo.inimigos
      .filter((e) => e.faixa === f)
      .filter((e) => Math.abs(estado.miraAltura - (0.485 - (1 - e.distancia) * 0.14)) <= 0.18)
      .sort((a, b) => a.distancia - b.distancia)[0];
    if (alvo) {
      alvo.vida--;
      if (alvo.vida <= 0) {
        proximo.inimigos = proximo.inimigos.filter((e) => e.id !== alvo.id);
        proximo.pontos += PONTOS_POR_ALVO;
        proximo = verificarOnda(proximo, sorteio);
      }
    }
    return proximo;
  }

  function receberDano(estado, quantidade) {
    if (estado.terminou || quantidade <= 0) return estado;
    const vidas = Math.max(0, estado.vidas - Math.floor(quantidade));
    return Object.assign({}, estado, {
      vidas, dano: 1,
      terminou: vidas === 0,
      resultado: vidas === 0 ? 'derrota' : estado.resultado
    });
  }

  function verificarOnda(estado, sorteio) {
    if (estado.inimigos.length || estado.terminou) return estado;
    if (estado.onda >= ONDAS) return Object.assign({}, estado, { terminou: true, resultado: 'vitoria' });
    const seguinte = Object.assign({}, estado, { onda: estado.onda + 1 });
    criarOnda(seguinte, sorteio);
    return seguinte;
  }

  function atualizar(estado, deltaMs, sorteio) {
    if (estado.terminou) return estado;
    const delta = limitar(Number(deltaMs) || 0, 0, 100);
    let proximo = Object.assign({}, estado, {
      dano: 0,
      recarregando: Math.max(0, estado.recarregando - delta),
      inimigos: estado.inimigos.map((e) => Object.assign({}, e, { distancia: e.distancia - e.velocidade * delta }))
    });
    if (estado.recarregando > 0 && proximo.recarregando === 0) proximo.municao = MUNICAO_MAXIMA;
    const chegaram = proximo.inimigos.filter((e) => e.distancia <= 0.12).length;
    if (chegaram) {
      proximo.inimigos = proximo.inimigos.filter((e) => e.distancia > 0.12);
      proximo = receberDano(proximo, chegaram);
      if (proximo.vidas === 0) return proximo;
    }
    return verificarOnda(proximo, sorteio);
  }

  return {
    ONDAS, MUNICAO_MAXIMA, PONTOS_POR_ALVO, novaPartida, moverMira,
    iniciarRecarga, disparar, receberDano, atualizar
  };
});
