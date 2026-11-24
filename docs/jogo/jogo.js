(async function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const config = window.JOGO_CONFIG || {};
  const canvas = $('tela');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 450;
  canvas.width = W; canvas.height = H;
  document.title = config.nome || 'Further and more';
  $('titulo').textContent = config.nome || 'Further and more';
  if (config.cor) document.documentElement.style.setProperty('--cor', config.cor);

  PlacarUI.montar(document.getElementById('painel-placar'));
  await Placar.iniciar();
  $('melhor').textContent = Placar.progresso().melhor;
  Placar.aoMudar((p) => { $('melhor').textContent = p.melhor; });

  let estado = null, animacao = 0, anterior = 0, terminando = false;
  let faixaTeclado = 1, miraX = 0.5, miraY = 0.52, mensagemAte = 0;

  function tela(id) {
    ['tela-inicio', 'tela-jogo', 'tela-fim'].forEach((nome) => { $(nome).hidden = nome !== id; });
  }

  function mostrarMensagem(texto, tempo = 1100) {
    $('mensagem').textContent = texto;
    mensagemAte = performance.now() + tempo;
  }

  function sincronizar() {
    if (!estado) return;
    $('vidas').textContent = estado.vidas;
    $('onda').textContent = estado.onda + '/' + Regras.ONDAS;
    $('alvos').textContent = estado.inimigos.length;
    $('pontos').textContent = estado.pontos;
    $('municao').textContent = estado.recarregando > 0
      ? 'RECARREGANDO' : estado.municao + '/' + Regras.MUNICAO_MAXIMA;
    $('mira').style.left = (miraX * 100) + '%';
    $('mira').style.top = (miraY * 100) + '%';
    if (estado.dano) mostrarMensagem('IMPACTO! Cuidado!', 700);
  }

  function poligono(pontos, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.moveTo(pontos[0][0], pontos[0][1]);
    for (let i = 1; i < pontos.length; i++) ctx.lineTo(pontos[i][0], pontos[i][1]);
    ctx.closePath(); ctx.fill();
  }

  function desenharAlvo(inimigo) {
    const perto = 1 - inimigo.distancia;
    const x = [245, 400, 555][inimigo.faixa] + Math.sin(inimigo.id * 7) * perto * 16;
    const y = 218 - perto * 63;
    const s = 12 + perto * 52;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    if (inimigo.fase === 'alvo') {
      ctx.fillStyle = '#ecdba2'; ctx.fillRect(-s * .55, -s * .8, s * 1.1, s * 1.6);
      ctx.fillStyle = '#bd4245'; ctx.fillRect(-s * .42, -s * .66, s * .84, s * 1.32);
      ctx.fillStyle = '#ffeaa2'; ctx.fillRect(-s * .29, -s * .5, s * .58, s);
      ctx.fillStyle = '#7a1f35'; ctx.fillRect(-s * .17, -s * .17, s * .34, s * .34);
      ctx.fillStyle = '#ffeaa2'; ctx.fillRect(-s * .07, -s * .07, s * .14, s * .14);
    } else {
      // Espantalho original feito de blocos, com chapéu e roupas remendadas.
      ctx.fillStyle = '#33211f'; ctx.fillRect(-s * .64, -s * .76, s * 1.28, s * .12);
      ctx.fillRect(-s * .37, -s * 1.02, s * .74, s * .3);
      ctx.fillStyle = '#c99651'; ctx.fillRect(-s * .25, -s * .72, s * .5, s * .42);
      ctx.fillStyle = '#261923'; ctx.fillRect(-s * .16, -s * .55, s * .07, s * .07); ctx.fillRect(s * .09, -s * .55, s * .07, s * .07);
      ctx.fillStyle = '#69804b'; ctx.fillRect(-s * .38, -s * .3, s * .76, s * .65);
      ctx.fillStyle = '#d1ad65'; ctx.fillRect(-s * .73, -s * .22, s * 1.46, s * .13);
      ctx.fillStyle = '#4d583b'; ctx.fillRect(-s * .28, s * .34, s * .19, s * .55); ctx.fillRect(s * .09, s * .34, s * .19, s * .55);
      ctx.fillStyle = '#d8bf7e'; ctx.fillRect(-s * .44, -s * .39, s * .14, s * .11); ctx.fillRect(s * .26, -s * .15, s * .14, s * .11);
    }
    ctx.fillStyle = '#fff0b0'; ctx.fillRect(-s * .45, s * .95, s * .9, Math.max(2, s * .08));
    ctx.fillStyle = '#30131f'; ctx.fillRect(-s * .45, s * .95, s * .9 * (inimigo.vida / (1 + Math.floor((estado.onda - 1) / 2))), Math.max(2, s * .08));
    ctx.restore();
  }

  function desenhar() {
    ctx.fillStyle = '#11132e'; ctx.fillRect(0, 0, W, H);
    // Estrelas e horizonte de blocos: cenário original sem imagens externas.
    for (let i = 0; i < 55; i++) {
      const x = (i * 137 + 31) % W, y = (i * 67 + 19) % 175;
      ctx.fillStyle = i % 4 === 0 ? '#f7c969' : '#9d9bc2'; ctx.fillRect(x, y, i % 6 === 0 ? 3 : 2, 2);
    }
    ctx.fillStyle = '#292040'; ctx.fillRect(0, 174, W, 54);
    for (let i = 0; i < 16; i++) {
      const x = i * 57 - 8, h = 10 + (i * 31 % 42);
      ctx.fillStyle = i % 2 ? '#332142' : '#38203a'; ctx.fillRect(x, 228 - h, 36, h);
      ctx.fillStyle = '#a55153'; ctx.fillRect(x + 7, 214 - h, 4, 4); ctx.fillRect(x + 22, 214 - h, 4, 4);
    }
    poligono([[0, 222], [800, 222], [800, 450], [0, 450]], '#483044');
    poligono([[0, 222], [400, 222], [400, 450], [0, 450]], '#50354b');
    ctx.strokeStyle = '#a35b5b'; ctx.lineWidth = 2;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8, y = 222 + t * t * 228;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const x = 400 + (i - 4) * (i < 4 ? 1 : -1) * 14;
      ctx.beginPath(); ctx.moveTo(400, 222); ctx.lineTo(x, 450); ctx.stroke();
    }
    if (estado) estado.inimigos.slice().sort((a, b) => b.distancia - a.distancia).forEach(desenharAlvo);
    // Silhueta genérica da arma em primeiro plano.
    poligono([[322, 450], [350, 383], [450, 383], [478, 450]], '#17151e');
    poligono([[360, 450], [375, 402], [425, 402], [440, 450]], '#6c5360');
    ctx.fillStyle = '#d4ad65'; ctx.fillRect(382, 390, 36, 8);
    if (estado && estado.dano) { ctx.fillStyle = 'rgba(255,80,80,.24)'; ctx.fillRect(0, 0, W, H); }
    if (estado && estado.recarregando > 0) {
      ctx.fillStyle = 'rgba(12,10,24,.65)'; ctx.fillRect(270, 70, 260, 42);
      ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.fillText('RECARREGANDO...', 400, 99);
    }
  }

  function quadro(agora) {
    if (!estado || terminando) return;
    const delta = anterior ? Math.min(agora - anterior, 100) : 16;
    anterior = agora;
    estado = Regras.atualizar(estado, delta, Math.random);
    if (estado.resultado === 'vitoria' || estado.resultado === 'derrota') { encerrar(); return; }
    sincronizar(); desenhar();
    if (agora > mensagemAte) $('mensagem').textContent = estado.recarregando > 0 ? 'Recarga em andamento...' : 'Mire e dispare!';
    animacao = requestAnimationFrame(quadro);
  }

  function comecar() {
    cancelAnimationFrame(animacao);
    const sorteio = Math.random;
    estado = Regras.novaPartida(config.dificuldade || 'media', sorteio);
    faixaTeclado = 1; miraX = .5; miraY = .52; terminando = false; anterior = 0;
    mostrarMensagem('Onda 1 — prepare-se!', 1300);
    tela('tela-jogo'); sincronizar(); desenhar();
    animacao = requestAnimationFrame(quadro);
  }

  async function encerrar() {
    if (terminando) return;
    terminando = true; cancelAnimationFrame(animacao);
    const pontos = estado.pontos;
    $('titulo-fim').textContent = estado.resultado === 'vitoria' ? 'Arena defendida!' : 'A arena foi tomada';
    $('resultado').textContent = pontos;
    $('situacao-salvamento').textContent = 'Salvando pontuação...';
    tela('tela-fim');
    try {
      const salvo = await Placar.registrarPartida(pontos, { ondas: estado.onda, resultado: estado.resultado });
      $('situacao-salvamento').textContent = Placar.modo() === 'nuvem' && !salvo.salvoNaNuvem
        ? 'Salvo neste aparelho. Entre com apelido e PIN no placar para sincronizar.' : 'Pontuação salva!';
    } catch (erro) { $('situacao-salvamento').textContent = 'Não deu para salvar: ' + erro.message; }
  }

  function mirarEvento(evento, dispararAgora) {
    const r = canvas.getBoundingClientRect();
    miraX = Math.max(0, Math.min(1, (evento.clientX - r.left) / r.width));
    miraY = Math.max(0, Math.min(1, (evento.clientY - r.top) / r.height));
    faixaTeclado = Math.max(0, Math.min(2, Math.floor(miraX * 3)));
    estado = Regras.moverMira(estado, faixaTeclado, miraY);
    sincronizar();
    if (dispararAgora) atirar();
  }

  function atirar() {
    if (!estado || terminando) return;
    if (estado.recarregando) { mostrarMensagem('A arma ainda está recarregando.'); return; }
    if (!estado.municao) { mostrarMensagem('Sem munição — recarregue!'); return; }
    const antigos = estado.inimigos.length;
    estado = Regras.disparar(estado, estado.miraFaixa, Math.random);
    mostrarMensagem(estado.inimigos.length < antigos ? 'Acerto! +100 pontos' : 'Disparo!');
    sincronizar(); desenhar();
    if (estado.resultado === 'vitoria') encerrar();
  }

  function recarregar() {
    if (!estado || terminando) return;
    const antes = estado.recarregando;
    estado = Regras.iniciarRecarga(estado);
    if (estado.recarregando > antes) mostrarMensagem('Recarga iniciada…');
    else if (estado.municao === Regras.MUNICAO_MAXIMA) mostrarMensagem('Munição completa.');
    sincronizar(); desenhar();
  }

  $('botao-jogar').addEventListener('click', comecar);
  $('botao-de-novo').addEventListener('click', comecar);
  $('botao-disparar').addEventListener('pointerdown', (e) => { e.preventDefault(); atirar(); });
  $('botao-recarregar').addEventListener('click', recarregar);
  document.querySelectorAll('[data-mover]').forEach((botao) => botao.addEventListener('pointerdown', (e) => {
    e.preventDefault(); faixaTeclado = Math.max(0, Math.min(2, faixaTeclado + Number(botao.dataset.mover)));
    miraX = (faixaTeclado + .5) / 3; estado = Regras.moverMira(estado, faixaTeclado, miraY); sincronizar();
  }));
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); mirarEvento(e, e.pointerType === 'mouse'); });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) mirarEvento(e, false); });
  canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') mirarEvento(e, false); });
  document.addEventListener('keydown', (e) => {
    if (!estado || terminando || $('tela-jogo').hidden) return;
    const tecla = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(tecla)) e.preventDefault();
    if (tecla === 'arrowleft' || tecla === 'a') faixaTeclado = Math.max(0, faixaTeclado - 1);
    if (tecla === 'arrowright' || tecla === 'd') faixaTeclado = Math.min(2, faixaTeclado + 1);
    if (tecla === 'arrowup' || tecla === 'w') miraY = Math.max(.15, miraY - .06);
    if (tecla === 'arrowdown' || tecla === 's') miraY = Math.min(.9, miraY + .06);
    if (tecla === ' ') atirar();
    if (tecla === 'r') recarregar();
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(tecla)) miraX = (faixaTeclado + .5) / 3;
    estado = Regras.moverMira(estado, faixaTeclado, miraY); sincronizar();
  });
  tela('tela-inicio'); desenhar();
})();
