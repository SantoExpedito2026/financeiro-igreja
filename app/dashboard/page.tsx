'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipAtivo, setTooltipAtivo] = useState<string | null>(null);
  const [sessao, setSessao] = useState<any>(null);
  
  // Estados de Controle de Perfil e do Modal flutuante administratório
  const [perfil, setPerfil] = useState<{ regra: 'ADMINISTRADOR' | 'TESOUREIRO' | 'LEITOR'; nome: string } | null>(null);
  const [modalUsuariosAberto, setModalUsuariosAberto] = useState(false);
  const [listaUsuarios, setListaUsuarios] = useState<any[]>([]);
  const [salvandoUsuarioId, setSalvandoUsuarioId] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autenticando, setAutenticando] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().substring(0, 10));
  const [salvando, setSalvando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7));
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // Monitora a sessão e dispara a busca de dados
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session) carregarDadosEPerfil(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      if (session) carregarDadosEPerfil(session.user.id);
      else { setPerfil(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Monitora a escolha da categoria para automação do Sicoob
  useEffect(() => {
    const catSelecionada = categorias.find(c => c.id.toString() === categoriaId);
    const nomeCat = catSelecionada?.nome?.toLowerCase() || '';
    if (nomeCat.includes('transferência') || nomeCat.includes('depósito')) {
      setContaId('2'); 
      if (!descricao) setDescricao('Transferência interna para o Sicoob');
    }
  }, [categoriaId, categorias]);
  // Busca a lista de perfis cadastrados no sistema (Para o Administrador)
  async function carregarListaUsuarios() {
    const { data, error } = await supabase
      .from('perfil_usuarios')
      .select('*')
      .order('nome', { ascending: true });
    
    if (data) setListaUsuarios(data);
    if (error) console.error('Erro ao carregar usuários:', error.message);
  }

  // Altera o nível de acesso (Regra) de um usuário específico
  async function handleAlterarRegraUsuario(id: string, novaRegra: 'ADMINISTRADOR' | 'TESOUREIRO' | 'LEITOR') {
    setSalvandoUsuarioId(id);
    const { error } = await supabase
      .from('perfil_usuarios')
      .update({ regra: novaRegra })
      .eq('id', id);

    setSalvandoUsuarioId(null);
    if (error) alert(`Erro ao alterar permissão: ${error.message}`);
    else carregarListaUsuarios(); 
  }

  // Remove o acesso do usuário do sistema
  async function handleRemoverAcessoUsuario(id: string, nomeUsuario: string) {
    if (!confirm(`Deseja realmente revogar e remover completamente o acesso de ${nomeUsuario}?`)) return;
    
    setSalvandoUsuarioId(id);
    const { error } = await supabase
      .from('perfil_usuarios')
      .delete()
      .eq('id', id);

    setSalvandoUsuarioId(null);
    if (error) alert(`Erro ao remover acesso: ${error.message}`);
    else { alert('Acesso removido com sucesso!'); carregarListaUsuarios(); }
  }

  // Busca os dados financeiros e o nível de acesso em tempo real
  async function carregarDadosEPerfil(userId: string) {
    setLoading(true);
    try {
      const { data: prof } = await supabase
        .from('perfil_usuarios')
        .select('regra, nome')
        .eq('id', userId)
        .single();
      
      if (prof) setPerfil(prof);
      
      if (prof?.regra === 'ADMINISTRADOR') {
        const { data: usrs } = await supabase.from('perfil_usuarios').select('*').order('nome', { ascending: true });
        if (usrs) setListaUsuarios(usrs);
      }

      const { data: t } = await supabase.from('transacoes').select('*, categorias(nome, tipo), contas(nome)').order('data_transacao', { ascending: true });
      const { data: c = [] } = await supabase.from('categorias').select('*').order('nome', { ascending: true }) || {};
      const { data: co } = await supabase.from('contas').select('*');
      
      if (t) setTransacoes(t);
      if (c) setCategorias(c);
      if (co) setContas(co);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return alert('Preencha os campos!');
    setAutenticando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAutenticando(false);
    if (error) alert(`Erro ao acessar: ${error.message}`);
  }

  async function handleLogout() {
    if (confirm('Sair?')) { setLoading(true); await supabase.auth.signOut(); }
  }

  function formatarMoeda(valorDigitado: string) {
    const apenasNumeros = valorDigitado.replace(/\D/g, '');
    if (!apenasNumeros) return '';
    const valorDecimal = (Number(apenasNumeros) / 100).toFixed(2);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valorDecimal));
  }

  function converterMoedaParaFloat(valorFormatado: string) {
    const limpo = valorFormatado.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (perfil?.regra === 'LEITOR') return alert('Seu perfil atual não tem permissão para realizar ou alterar lançamentos.');
    if (!descricao || !valor || !categoriaId || !contaId) return alert('Preencha os campos obrigatórios!');
    setSalvando(true);
    
    let urlComprovante = null;
    let enviouNovoArquivo = false;

    if (arquivo && tipo === 'SAIDA') {
      const nomeArquivo = `${Date.now()}_${arquivo.name}`;
      const { error: upErr } = await supabase.storage.from('comprovantes').upload(nomeArquivo, arquivo);
      if (upErr) { setSalvando(false); return alert('Erro no upload.'); }
      urlComprovante = supabase.storage.from('comprovantes').getPublicUrl(nomeArquivo).data.publicUrl;
      enviouNovoArquivo = true;
    }

    const valorNumericoReal = converterMoedaParaFloat(valor);
    const dados: any = { 
      descricao, valor: valorNumericoReal, tipo, 
      categoria_id: parseInt(categoriaId, 10), conta_id: parseInt(contaId, 10), 
      forma_pagamento: formaPagamento, data_transacao: dataTransacao, status: 'CONCRETIZADO'
    };

    if (!editandoId || enviouNovoArquivo) dados.url_comprovante = urlComprovante;

    const { error } = editandoId 
      ? await supabase.from('transacoes').update(dados).eq('id', editandoId) 
      : await supabase.from('transacoes').insert([dados]);

    setSalvando(false);
    if (error) alert(`Erro ao salvar: ${error.message}`);
    else { 
      setDescricao(''); setValor(''); setCategoriaId(''); setContaId(''); setArquivo(null); setEditandoId(null);
      if (sessao) carregarDadosEPerfil(sessao.user.id);
    }
  }

  function iniciarEdicao(t: any) {
    if (perfil?.regra === 'LEITOR') return;
    setEditandoId(t.id); setDescricao(t.descricao);
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor);
    setValor(valorFormatado); setTipo(t.tipo);
    setCategoriaId(t.categoria_id?.toString() || t.category_id?.toString() || ''); 
    setContaId(t.conta_id?.toString() || ''); setFormaPagamento(t.forma_pagamento || 'Dinheiro'); setDataTransacao(t.data_transacao);
    setArquivo(null);
  }

    async function handleDeletar(id: any) {
    // Trava de segurança para exclusão
    if (perfil?.regra === 'LEITOR') return alert('Seu perfil não tem permissão para excluir registros.');
    if (!confirm('Deseja realmente excluir este lançamento?')) return;
    
    // Força a conversão do id para número inteiro antes de enviar ao Supabase
    const idNumerico = parseInt(id, 10);

    const { error } = await supabase
      .from('transacoes')
      .delete()
      .eq('id', idNumerico);

    if (error) {
      alert(`Erro ao excluir no banco de dados: ${error.message}`);
    } else {
      // Recarrega a listagem atualizada da sessão imediatamente após apagar
      if (sessao) carregarDadosEPerfil(sessao.user.id);
    }
  }
  if (loading) return <div className="p-8 text-center">Carregando permissões do painel...</div>;
  if (!sessao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md max-w-md w-full space-y-4">
          <h1 className="text-2xl font-bold text-center">Comunidade Santo Expedito</h1>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full border p-2 rounded-lg" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full border p-2 rounded-lg" required />
          <button type="submit" disabled={autenticando} className="w-full bg-blue-600 text-white p-2 rounded-lg font-bold">{autenticando ? 'Acessando...' : 'Acessar'}</button>
        </form>
      </div>
    );
  }

  const isAgosto = mesFiltro === "2026-08";
    // ... CÓDIGO DO FORMULÁRIO DE LOGIN DEIXAR IGUAL

    // Linha de base oficial paroquial herdada do fechamento do mês 08 (Agosto)
  const SALDO_INICIAL_CAIXA_REAL = 3146.95;
  const SALDO_INICIAL_BANCO_REAL = 97743.09;

  // 1. Filtra as transações pertencentes estritamente ao mês selecionado na tela
  const transacoesFiltradas = transacoes.filter(t => 
    t.data_transacao.startsWith(mesFiltro) && 
    t.descricao?.toLowerCase().includes(buscaTexto.toLowerCase()) && 
    (filtroTipo === 'TODOS' ? true : t.tipo === filtroTipo)
  );
  
  // 2. Variáveis dinâmicas para acumular os meses passados e processar o período atual
  let saldoAcumuladoCaixaAteMes = SALDO_INICIAL_CAIXA_REAL;
  let saldoAcumuladoBancoAteMes = SALDO_INICIAL_BANCO_REAL;

  let totalEntradasCaixaMes = 0;
  let totalSaidasCaixaMes = 0;
  let totalEntradasBancoMes = 0;
  let totalSaidasBancoMes = 0;

  // Varre a linha do tempo contábil de todas as transações
  transacoes.forEach(t => {
    const valorNum = Number(t.valor) || 0;
    const dataDoLancamento = t.data_transacao || '';
    
    const ehMesAnterior = dataDoLancamento < `${mesFiltro}-01`;
    const ehMesAtual = dataDoLancamento.startsWith(mesFiltro);

    // Identifica de forma automatizada depósitos e transferências internas para o Sicoob
    const nomeCategoria = t.categorias?.nome?.toLowerCase() || '';
    const isTransferencia = nomeCategoria.includes('transferência') || nomeCategoria.includes('depósito');

    if (ehMesAnterior) {
      // --- REGRA DE ACUMULAÇÃO HISTÓRICA DE MESES PASSADOS ---
      if (t.tipo === 'ENTRADA') {
        if (t.conta_id === 1) saldoAcumuladoCaixaAteMes += valorNum;
        else saldoAcumuladoBancoAteMes += valorNum;
      } else {
        if (t.conta_id === 1) {
          saldoAcumuladoCaixaAteMes -= valorNum;
          if (isTransferencia) saldoAcumuladoBancoAteMes += valorNum;
        } else {
          saldoAcumuladoBancoAteMes -= valorNum;
        }
      }
    } else if (ehMesAtual) {
      // --- REGRA DE FLUXO DO MÊS SELECIONADO NA TELA ---
      if (t.tipo === 'ENTRADA') {
        if (t.conta_id === 1) totalEntradasCaixaMes += valorNum;
        else totalEntradasBancoMes += valorNum;
      } else {
        if (t.conta_id === 1) {
          totalSaidasCaixaMes += valorNum;
          // Regra Automática: Sai do Caixa Físico e entra direto no Banco Sicoob
          if (isTransferencia) totalEntradasBancoMes += valorNum;
        } else {
          totalSaidasBancoMes += valorNum;
        }
      }
    }
  });

  // 3. Consolidação matemática viva das caixas e saldos
  const totalGeralEntradas = totalEntradasCaixaMes + totalEntradasBancoMes;
  const totalGeralSaidas = totalSaidasCaixaMes + totalSaidasBancoMes;

  const saldoAtualCaixa = saldoAcumuladoCaixaAteMes + totalEntradasCaixaMes - totalSaidasCaixaMes;
  const saldoAtualBanco = saldoAcumuladoBancoAteMes + totalEntradasBancoMes - totalSaidasBancoMes;
  const saldoFinalTotal = saldoAtualCaixa + saldoAtualBanco;

  const totaisCategorias: { [key: string]: { total: number; tipo: string; porcentagem: number } } = {};
  const transacoesDoMes = transacoes.filter(t => t.data_transacao.startsWith(mesFiltro));

  transacoesDoMes.forEach(t => {
    const name = t.categorias?.nome || 'Sem categoria';
    if (!totaisCategorias[name]) {
      totaisCategorias[name] = { total: 0, tipo: t.tipo, porcentagem: 0 };
    }
    totaisCategorias[name].total += Number(t.valor);
  });

  Object.keys(totaisCategorias).forEach(name => {
    const cat = totaisCategorias[name];
    const divisor = cat.tipo === 'ENTRADA' ? totalGeralEntradas : totalGeralSaidas;
    cat.porcentagem = divisor > 0 ? (cat.total / divisor) * 100 : 0;
  });

    return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans print:bg-white print:text-black print:p-0">
      <div className="border-b pb-4 flex items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Comunidade Santo Expedito</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm">Painel de Gestão e Fluxo de Caixa</p>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
              {perfil?.regra || 'Buscando Perfil...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {perfil?.regra === 'ADMINISTRADOR' && (
            <button 
              onClick={() => { carregarListaUsuarios(); setModalUsuariosAberto(true); }} 
              className="bg-gray-100 text-gray-700 font-bold py-2 px-3.5 rounded-lg text-sm transition hover:bg-gray-200"
              title="Gerenciar Acessos"
            >
              ⚙️ Usuários
            </button>
          )}
          <button onClick={handleLogout} className="bg-rose-100 text-rose-600 font-bold py-2 px-4 rounded-lg text-sm">Sair</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <h3 className="text-sm font-bold text-gray-500 uppercase">Período de Referência</h3>
        <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="border p-2 rounded-lg font-bold" />
      </div>

            {/* Cards de Saldo com linha de base real acumulada mês a mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold text-center">
        <div className="bg-white p-4 rounded-xl border shadow-sm relative">
          <div className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 cursor-pointer select-none text-base z-30 print:hidden" onMouseEnter={() => setTooltipAtivo('caixa')} onMouseLeave={() => setTooltipAtivo(null)}>
            ⓘ
            {tooltipAtivo === 'caixa' && (
              <div className="absolute right-0 top-6 bg-zinc-900 text-gray-100 text-xs font-normal rounded-lg p-3 w-64 text-left border border-zinc-700 z-50 shadow-2xl pointer-events-none leading-relaxed">
                <p className="font-bold text-emerald-400 mb-1">📋 Histórico do Caixa:</p>
                <p className="text-zinc-300">Abertura do Período: <span className="font-mono text-white">R$ {saldoAcumuladoCaixaAteMes.toFixed(2)}</span></p>
                <p className="text-zinc-300">(+) Entradas do Mês: <span className="font-mono text-white">R$ {totalEntradasCaixaMes.toFixed(2)}</span></p>
                <p className="text-rose-400 font-medium">(-) Saídas do Mês: <span className="font-mono">R$ {totalSaidasCaixaMes.toFixed(2)}</span></p>
                <div className="border-t border-zinc-700 my-1.5"></div>
                <p className="font-bold text-zinc-100">(=) Saldo Atual: <span className="font-mono text-emerald-400">R$ {saldoAtualCaixa.toFixed(2)}</span></p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 uppercase">Caixa Físico</p>
          <p className="text-sm text-gray-500 font-normal">Abertura: R$ {saldoAcumuladoCaixaAteMes.toFixed(2)}</p>
          <p className="text-xl text-emerald-600 mt-1">Atual: R$ {saldoAtualCaixa.toFixed(2)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm relative">
          <div className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 cursor-pointer select-none text-base z-30 print:hidden" onMouseEnter={() => setTooltipAtivo('sicoob')} onMouseLeave={() => setTooltipAtivo(null)}>
            ⓘ
            {tooltipAtivo === 'sicoob' && (
              <div className="absolute right-0 top-6 bg-zinc-900 text-gray-100 text-xs font-normal rounded-lg p-3 w-64 text-left border border-zinc-700 z-50 shadow-2xl pointer-events-none leading-relaxed">
                <p className="font-bold text-blue-400 mb-1">📋 Histórico Bancário:</p>
                <p className="text-zinc-300">Abertura do Período: <span className="font-mono text-white">R$ {saldoAcumuladoBancoAteMes.toFixed(2)}</span></p>
                <p className="text-zinc-300">(+) Depósitos / Entradas: <span className="font-mono text-white">R$ {totalEntradasBancoMes.toFixed(2)}</span></p>
                <p className="text-rose-400 font-medium">(-) Tarifas / Saídas: <span className="font-mono">R$ {totalSaidasBancoMes.toFixed(2)}</span></p>
                <div className="border-t border-zinc-700 my-1.5"></div>
                <p className="font-bold text-zinc-100">(=) Saldo Atual: <span className="font-mono text-blue-400">R$ {saldoAtualBanco.toFixed(2)}</span></p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 uppercase">Contas Bancárias (Sicoob)</p>
          <p className="text-sm text-gray-500 font-normal">Abertura: R$ {saldoAcumuladoBancoAteMes.toFixed(2)}</p>
          <p className="text-xl text-blue-600 mt-1">Atual: R$ {saldoAtualBanco.toFixed(2)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100 relative">
          <p className="text-xs text-gray-500 uppercase">Disponibilidade Real Total</p>
          <p className="text-sm text-gray-400 font-normal">Abertura Histórica: R$ {(saldoAcumuladoCaixaAteMes + saldoAcumuladoBancoAteMes).toFixed(2)}</p>
          <p className="text-2xl text-gray-800 mt-1">R$ {saldoFinalTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center font-bold">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <p className="text-xs text-emerald-700 uppercase">Total de Entradas do Mês</p>
          <p className="text-2xl text-emerald-600">+ R$ {totalGeralEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <p className="text-xs text-rose-700 uppercase">Total de Saídas do Mês</p>
          <p className="text-2xl text-rose-600">- R$ {totalGeralSaidas.toFixed(2)}</p>
        </div>
      </div>

      {/* 📊 DASHBOARDS VISUAIS: ENTRADAS E SAÍDAS POR CATEGORIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Entradas */}
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-emerald-700 uppercase mb-4 flex items-center gap-1.5">
            📊 Distribuição de Receitas (Entradas)
          </h3>
          <div className="space-y-4">
            {Object.entries(totaisCategorias)
              .filter(([_, c]) => c.tipo === 'ENTRADA')
              .sort((a, b) => b[1].total - a[1].total)
              .map(([n, c]) => (
                <div key={n} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-gray-600">
                    <span className="font-bold text-gray-700">{n}</span>
                    <span>
                      R$ {c.total.toFixed(2)} 
                      <span className="text-emerald-600 font-bold ml-1.5">({c.porcentagem.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${c.porcentagem}%` }}></div>
                  </div>
                </div>
              ))}
            {Object.values(totaisCategorias).filter(c => c.tipo === 'ENTRADA').length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma receita registrada neste período.</p>
            )}
          </div>
        </div>

        {/* Gráfico de Saídas */}
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-rose-700 uppercase mb-4 flex items-center gap-1.5">
            📊 Destinação de Recursos (Despesas)
          </h3>
          <div className="space-y-4">
            {Object.entries(totaisCategorias)
              .filter(([_, c]) => c.tipo === 'SAIDA')
              .sort((a, b) => b[1].total - a[1].total)
              .map(([n, c]) => (
                <div key={n} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-gray-600">
                    <span className="font-bold text-gray-700">{n}</span>
                    <span>
                      R$ {c.total.toFixed(2)} 
                      <span className="text-rose-600 font-bold ml-1.5">({c.porcentagem.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${c.porcentagem}%` }}></div>
                  </div>
                </div>
              ))}
            {Object.values(totaisCategorias).filter(c => c.tipo === 'SAIDA').length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma despesa registrada neste período.</p>
            )}
          </div>
        </div>
      </div>

      {/* Trava Visual do Formulário */}
      {perfil?.regra !== 'LEITOR' ? (
        <div className="bg-white p-6 rounded-xl border print:hidden">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            {editandoId ? '✏️ Editar Lançamento' : '📝 Novo Lançamento'}
          </h2>
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <select value={tipo} onChange={(e: any) => { setTipo(e.target.value); setCategoriaId(''); }} className="border p-2 rounded-lg bg-gray-50">

              <option value="ENTRADA">ENTRADA (Receitas)</option>
              <option value="SAIDA">SAIDA (Despesas)</option>
            </select>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="border p-2 rounded-lg bg-gray-50">
              <option value="">Selecione a Categoria...</option>
              {categorias.filter(c => c.tipo === tipo).map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="border p-2 rounded-lg bg-gray-50">
              <option value="">Conta...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" className="border p-2 rounded-lg" />
            <input type="text" value={valor} onChange={(e) => setValor(formatarMoeda(e.target.value))} placeholder="R$ 0,00" className="border p-2 rounded-lg font-mono font-bold" />
            <input type="date" value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="border p-2 rounded-lg" />
            {tipo === 'SAIDA' && (
              <div className="flex flex-col">
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} className="w-full border p-1 rounded-lg text-xs bg-gray-50 cursor-pointer" />
              </div>
            )}
            <button type="submit" disabled={salvando} className="bg-blue-600 text-white font-bold p-2 rounded-lg hover:bg-blue-700 transition">{salvando ? '...' : editandoId ? 'Atualizar' : 'Registrar'}</button>
          </form>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium print:hidden">
          ℹ️ Seu perfil atual é de apenas <strong>Leitura</strong>. Você pode acompanhar as movimentações e emitir relatórios, mas não possui permissões para criar ou alterar registros financeiros.
        </div>
      )}

      {/* Lançamentos Recentes */}
      <div className="bg-white p-6 rounded-xl border overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 print:hidden">
          <h2 className="text-xl font-bold text-gray-700">📋 Lançamentos Recentes</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg border text-xs font-bold text-gray-600">
            <button type="button" onClick={() => setFiltroTipo('TODOS')} className={`px-3 py-1.5 rounded-md ${filtroTipo === 'TODOS' ? 'bg-white shadow-sm text-gray-800' : ''}`}>Todos</button>
            <button type="button" onClick={() => setFiltroTipo('ENTRADA')} className={`px-3 py-1.5 rounded-md ${filtroTipo === 'ENTRADA' ? 'bg-emerald-600 text-white shadow-sm' : ''}`}>Entradas</button>
            <button type="button" onClick={() => setFiltroTipo('SAIDA')} className={`px-3 py-1.5 rounded-md ${filtroTipo === 'SAIDA' ? 'bg-rose-600 text-white shadow-sm' : ''}`}>Saídas</button>
          </div>
          <button onClick={() => window.print()} className="bg-gray-800 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition hover:bg-gray-900">🖨️ Imprimir Relatório Mensal</button>
        </div>
        
        <div className="mb-4 print:hidden">
          <input type="text" value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} placeholder="🔍 Procurar por dízimos, ofertas ou despesas..." className="w-full border p-2 rounded-lg bg-gray-50 text-sm focus:outline-none" />
        </div>

        <h2 className="text-xl font-bold text-gray-700 mb-4 hidden print:block text-center border-b pb-2">📋 Relatório Mensal de Lançamentos - Comunidade Santo Expedito</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-gray-400 uppercase text-xs">
              <th className="pb-3 w-[15%]">Data</th>
              <th className="pb-3 w-[35%]">Descrição</th>
              <th className="pb-3 w-[23%]">Categoria</th>
              <th className="pb-3 text-center w-[10%]">Doc</th>
              <th className="pb-3 text-right w-[17%]">Valor</th>
              {perfil?.regra !== 'LEITOR' && <th className="pb-3 text-center print:hidden w-[10%]">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-600">
            {transacoesFiltradas.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                <td className="py-3 whitespace-nowrap">{new Date(t.data_transacao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="py-3 font-bold text-gray-800 pr-2">{t.descricao}</td>
                <td className="py-3">{t.categorias?.nome || 'Sem categoria'}</td>
                                <td className="py-3 text-center">
                  {t.url_comprovante ? (
                    <a 
                      href={t.url_comprovante} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 font-bold hover:underline print:hidden"
                    >
                      📄 Ver
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs italic">-</span>
                  )}
                  <span className="hidden print:inline text-xs text-gray-400">
                    {t.url_comprovante ? 'Sim' : 'Não'}
                  </span>
                </td>

                <td className="py-3 text-right font-bold whitespace-nowrap text-gray-700">
                  {t.tipo === 'ENTRADA' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                </td>
                {perfil?.regra !== 'LEITOR' && (
                  <td className="py-3 text-center print:hidden">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => iniciarEdicao(t)} className="text-xs bg-amber-100 text-amber-700 font-bold py-1 px-2 rounded-lg transition" title="Editar">✏️</button>
                      <button type="button" onClick={() => handleDeletar(t.id)} className="text-xs bg-rose-100 text-rose-600 font-bold py-1 px-2 rounded-lg transition" title="Excluir">🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {transacoesFiltradas.length === 0 && (
              <tr>
                <td colSpan={perfil?.regra !== 'LEITOR' ? 6 : 5} className="py-8 text-center text-gray-400">Nenhum lançamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔐 PAINEL FLUTUANTE (MODAL): GESTÃO DE PERFIS E REVOGAÇÃO DE ACESSOS */}
      {modalUsuariosAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">🔐 Controle de Usuários e Permissões</h3>
                <p className="text-xs text-gray-500 mt-0.5">Defina quem pode lançar, editar ou apenas auditar os livros da igreja.</p>
              </div>
              <button onClick={() => setModalUsuariosAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl font-mono">×</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="divide-y">
                {listaUsuarios.map((u) => (
                  <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-bold text-gray-800">{u.nome || 'Usuário Paroquial'}</p>
                      <p className="text-xs text-gray-400 font-mono">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={u.regra}
                        disabled={salvandoUsuarioId === u.id}
                        onChange={(e) => handleAlterarRegraUsuario(u.id, e.target.value as any)}
                        className="border p-1.5 rounded-lg text-xs bg-gray-50 font-bold text-gray-700 outline-none"
                      >
                        <option value="ADMINISTRADOR">👑 ADMINISTRADOR</option>
                        <option value="TESOUREIRO">💼 TESOUREIRO</option>
                        <option value="LEITOR">👁️ LEITOR (Apenas Vista)</option>
                      </select>

                      <button
                        type="button"
                        disabled={salvandoUsuarioId === u.id}
                        onClick={() => handleRemoverAcessoUsuario(u.id, u.nome || u.email)}
                        className="bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition hover:bg-rose-100"
                      >
                        🗑️ Revogar
                      </button>
                    </div>
                  </div>
                ))}
                {listaUsuarios.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum outro perfil mapeado na tabela.</p>
                )}
              </div>
            </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setModalUsuariosAberto(false)} className="bg-gray-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition hover:bg-gray-900">
                Concluir e Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ ESTILOS NATIVOS DE IMPRESSÃO INTEGRADOS AO NEXT.JS 16 */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
          .max-w-7xl { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          th, td { padding-top: 6px !important; padding-bottom: 6px !important; font-size: 11px !important; }
        }
      `}} />

    </div>
  );
}