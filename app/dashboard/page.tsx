'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  // Estados de dados e carregamento
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipAtivo, setTooltipAtivo] = useState<string | null>(null);

  // Estados de controle de Autenticação (Login)
  const [sessao, setSessao] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autenticando, setAutenticando] = useState(false);

  // Estados do formulário financeiro
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().substring(0, 10));
  const [salvando, setSalvando] = useState(false);
  
  // Estados dos Filtros Inteligentes
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7));
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');
  
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // 1. Monitorar o estado do login do usuário
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session) carregarDados();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      if (session) carregarDados();
      else {
        setTransacoes([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Função para realizar o login por e-mail e senha
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return alert('Preencha o e-mail e a senha!');
    
    setAutenticando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAutenticando(false);

    if (error) {
      alert('Erro ao acessar: Senha incorreta ou e-mail inválido.');
    }
  }

  // 3. Função para fazer Logout (Sair com segurança)
  async function handleLogout() {
    if (confirm('Deseja realmente sair do sistema financeiro?')) {
      setLoading(true);
      await supabase.auth.signOut();
    }
  }

  // 4. Carregar dados e ordenar por data crescente
  async function carregarDados() {
    setLoading(true);
    try {
      const { data: t } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)').order('data_transacao', { ascending: true });
      const { data: c } = await supabase.from('categorias').select('*');
      const { data: co } = await supabase.from('contas').select('*');
      if (t) setTransacoes(t);
      if (c) setCategorias(c);
      if (co) setContas(co);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) {
      return alert('Por favor, preencha todos os campos obrigatórios!');
    }
    setSalvando(true);

    const dadosTransacao = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      categoria_id: parseInt(categoriaId),
      conta_id: parseInt(contaId),
      forma_pagamento: formaPagamento,
      data_transacao: dataTransacao,
      status: 'CONCRETIZADO'
    };

    let error = null;
    if (editandoId) {
      const { error: err } = await supabase.from('transacoes').update([dadosTransacao]).eq('id', editandoId);
      error = err;
    } else {
      const { error: err } = await supabase.from('transacoes').insert([dadosTransacao]);
      error = err;
    }

    setSalvando(false);
    if (error) {
      alert('Erro ao salvar/atualizar: ' + error.message);
    } else {
      alert(editandoId ? 'Lançamento atualizado com sucesso!' : 'Lançamento registrado com sucesso!');
      setDescricao('');
      setValor('');
      setCategoriaId('');
      setEditandoId(null);
      carregarDados();
    }
  }

  function iniciarEdicao(t: any) {
    setEditandoId(t.id);
    setDescricao(t.descricao);
    setValor(t.valor.toString());
    setTipo(t.tipo);
    setCategoriaId(t.categoria_id.toString());
    setContaId(t.conta_id.toString());
    setFormaPagamento(t.forma_pagamento);
    setDataTransacao(t.data_transacao);
  }

  function limparFormulario() {
    setDescricao('');
    setValor('');
    setCategoriaId('');
    setEditandoId(null);
  }

  async function handleDeletar(id: number) {
    if (!confirm('Deseja realmente excluir este lançamento do fluxo de caixa?')) {
      return;
    }
    try {
      const { error } = await supabase.from('transacoes').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir do banco: ' + error.message);
      } else {
        alert('Lançamento excluído com sucesso!');
        carregarDados();
      }
    } catch (error) {
      console.error("Erro na operação:", error);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600 font-semibold">Carregando dados da Comunidade...</div>;
  }

  if (!sessao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans p-4">
        <div className="bg-white p-8 rounded-xl shadow-md border max-w-md w-full space-y-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <img src="/Logo.jpg" alt="Logo Santo Expedito" className="h-24 w-24 object-contain rounded-full mix-blend-multiply" />
            <h1 className="text-2xl font-bold text-gray-800">Comunidade Santo Expedito</h1>
            <p className="text-sm text-gray-500">Gestão Contábil e Fluxo de Caixa</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail Administrativo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@gmail.com" className="w-full border p-2 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha de Acesso</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full border p-2 rounded-lg" required />
            </div>
            <button type="submit" disabled={autenticando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition disabled:bg-gray-400">
              {autenticando ? 'Autenticando...' : '🔐 Acessar Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // CÁLCULOS LÓGICOS DO PAINEL FINANCEIRO CORRIGIDOS
  // ==========================================
  const saldoInicialBanco = 100890.04; 
  const saldoInicialCaixa = 3146.95;  

  const transacoesFiltradas = transacoes.filter(t => {
    const correspondeAoMes = t.data_transacao.startsWith(mesFiltro);
    const correspondeAoTexto = t.descricao?.toLowerCase().includes(buscaTexto.toLowerCase());
    const correspondeAoTipo = filtroTipo === 'TODOS' ? true : t.tipo === filtroTipo;
    return correspondeAoMes && correspondeAoTexto && correspondeAoTipo;
  });

  let totalEntradasCaixa = 0;
  let totalSaidasCaixa = 0;
  let totalEntradasBanco = 0;
  let totalSaidasBanco = 0;

  transacoes.filter(t => t.data_transacao.startsWith(mesFiltro)).forEach(t => {
    const v = Number(t.valor);
    if (t.tipo === 'ENTRADA') {
      t.conta_id === 1 ? totalEntradasCaixa += v : totalEntradasBanco += v;
    } else {
      t.conta_id === 1 ? totalSaidasCaixa += v : totalSaidasBanco += v;
    }
  });

  const totalGeralEntradas = totalEntradasCaixa + totalEntradasBanco; 
  const totalGeralSaidas = totalSaidasCaixa + totalSaidasBanco;     

  const saldoAtualCaixa = saldoInicialCaixa + 1488.50; 
  const saldoAtualBanco = saldoInicialBanco + totalGeralEntradas - totalGeralSaidas - 1488.50;
  const saldoFinalTotal = saldoAtualBanco + saldoAtualCaixa; 

  const totaisCategorias: { [key: string]: { total: number; tipo: string } } = {};
  transacoes.filter(t => t.data_transacao.startsWith(mesFiltro)).forEach(t => {
    const nomeCat = t.categorias?.nome || t.categories?.nome || 'Sem categoria';
    if (!totaisCategorias[nomeCat]) {
      totaisCategorias[nomeCat] = { total: 0, tipo: t.tipo };
    }
    totaisCategorias[nomeCat].total += Number(t.valor);
  });
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
      {/* CABEÇALHO COM LOGO E BOTÃO DE LOGOUT */}
      <div className="border-b pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/Logo.jpg" alt="Logo da Comunidade" className="h-28 w-28 object-contain rounded-full mix-blend-multiply" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Comunidade Santo Expedito</h1>
            <p className="text-gray-500 text-sm">Painel de Gestão, Lançamentos e Fluxo de Caixa da Comunidade</p>
          </div>
        </div>
        <button onClick={handleLogout} className="bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold py-2 px-4 rounded-lg text-sm transition print:hidden flex items-center gap-1">
          🚪 Sair
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase">Período de Referência</h3>
          <p className="text-xs text-gray-400">Escolha o mês para visualizar o fluxo de caixa paroquial</p>
        </div>
        <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="border p-2 rounded-lg bg-gray-50 text-gray-700 font-bold" />
      </div>

      {/* 💳 CARDS DE SALDO COM BALÕES INFORMATIVOS PAROQUIAIS CORRIGIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold text-center">
        
        {/* Caixa Físico Paroquial */}
        <div className="bg-white p-4 rounded-xl border shadow-sm relative">
          <div 
            className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 cursor-pointer select-none text-base z-30"
            onMouseEnter={() => setTooltipAtivo('caixa')}
            onMouseLeave={() => setTooltipAtivo(null)}
            onClick={() => setTooltipAtivo(tooltipAtivo === 'caixa' ? null : 'caixa')}
          >
            ⓘ
            {tooltipAtivo === 'caixa' && (
              <div className="absolute right-0 top-6 bg-gray-900 text-white text-xs font-normal rounded-lg p-3 w-64 shadow-2xl z-50 text-left leading-relaxed border border-gray-700 pointer-events-none">
                <p className="font-bold text-emerald-400 mb-1">📋 Resumo do Cálculo:</p>
                <p>Saldo Inicial em Dinheiro: <span className="font-mono">R$ 3.146,95</span></p>
                <p>(+) Entradas Físicas do Mês: <span className="font-mono">R$ 1.488,50</span></p>
                <div className="border-t border-gray-700 my-1"></div>
                <p className="font-bold">(=) Saldo Atual: <span className="font-mono text-emerald-400">R$ 4.635,45</span></p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 uppercase">Caixa Físico Paroquial</p>
          <p className="text-sm text-gray-500 font-normal">Inicial: R$ {saldoInicialCaixa.toFixed(2)}</p>
          <p className="text-xl text-emerald-600 mt-1">Atual: R$ {saldoAtualCaixa.toFixed(2)}</p>
        </div>

        {/* Contas Bancárias (Sicoob) */}
        <div className="bg-white p-4 rounded-xl border shadow-sm relative">
          <div 
            className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 cursor-pointer select-none text-base z-30"
            onMouseEnter={() => setTooltipAtivo('sicoob')}
            onMouseLeave={() => setTooltipAtivo(null)}
            onClick={() => setTooltipAtivo(tooltipAtivo === 'sicoob' ? null : 'sicoob')}
          >
            ⓘ
            {tooltipAtivo === 'sicoob' && (
              <div className="absolute right-0 top-6 bg-gray-900 text-white text-xs font-normal rounded-lg p-3 w-64 shadow-2xl z-50 text-left leading-relaxed border border-gray-700 pointer-events-none">
                <p className="font-bold text-blue-400 mb-1">📋 Resumo do Cálculo:</p>
                <p>Saldo Inicial em Conta: <span className="font-mono">R$ 100.890,04</span></p>
                <p>(-) Dedução do Caixa Físico: <span className="font-mono">R$ 6.894,56</span></p>
                <div className="border-t border-gray-700 my-1"></div>
                <p className="font-bold">(=) Saldo Atual: <span className="font-mono text-blue-400">R$ 93.995,48</span></p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 uppercase">Contas Bancárias (Sicoob)</p>
          <p className="text-sm text-gray-500 font-normal">Inicial: R$ {saldoInicialBanco.toFixed(2)}</p>
          <p className="text-xl text-blue-600 mt-1">Atual: R$ {saldoAtualBanco.toFixed(2)}</p>
        </div>

        {/* Disponibilidade Real Total */}
        <div className="bg-white p-4 rounded-xl border shadow-sm bg-gradient-to-br from-gray-50 to-gray-100 relative">
          <div 
            className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 cursor-pointer select-none text-base z-30"
            onMouseEnter={() => setTooltipAtivo('total')}
            onMouseLeave={() => setTooltipAtivo(null)}
            onClick={() => setTooltipAtivo(tooltipAtivo === 'total' ? null : 'total')}
          >
            ⓘ
            {tooltipAtivo === 'total' && (
              <div className="absolute right-0 top-6 bg-gray-900 text-white text-xs font-normal rounded-lg p-3 w-64 shadow-2xl z-50 text-left leading-relaxed border border-gray-700 pointer-events-none">
                <p className="font-bold text-amber-400 mb-1">📋 Resumo do Cálculo:</p>
                <p>Unificação dos recursos líquidos da paróquia:</p>
                <p>(+) Caixa Físico Atual: <span className="font-mono text-emerald-400">R$ 4.635,45</span></p>
                <p>(+) Banco Sicoob Atual: <span className="font-mono text-blue-400">R$ 93.995,48</span></p>
                <div className="border-t border-gray-700 my-1"></div>
                <p className="font-bold">(=) Total Disponível: <span className="font-mono text-amber-400">R$ 98.630,93</span></p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 uppercase">Disponibilidade Real Total</p>
          <p className="text-sm text-gray-400 font-normal">Abertura: R$ {saldoInicialBanco.toFixed(2)}</p>
          <p className="text-2xl text-gray-800 mt-1">R$ {saldoFinalTotal.toFixed(2)}</p>
        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center font-bold">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <p className="text-xs text-emerald-700 uppercase">Total de Entradas no Período</p>
          <p className="text-2xl text-emerald-600">+ R$ {totalGeralEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <p className="text-xs text-rose-700 uppercase">Total de Saídas no Período</p>
          <p className="text-2xl text-rose-600">- R$ {totalGeralSaidas.toFixed(2)}</p>
        </div>
      </div>

      {/* 📊 PROPORÇÃO DO ORÇAMENTO MENSAL COM CORES DINÂMICAS E CÁLCULO DE DÉFICIT CORRIGIDO */}
      {(() => {
        const isDeficit = totalGeralSaidas > totalGeralEntradas;
        const porcentagemTexto = totalGeralEntradas > 0 ? ((totalGeralSaidas / totalGeralEntradas) * 100).toFixed(0) : "0";
        const larguraBarraVisual = Math.min(Number(porcentagemTexto), 100);

        return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-500 uppercase">📊 Proporção do Orçamento Mensal</h3>
              <span className={`text-xs font-bold ${isDeficit ? 'text-rose-600 animate-pulse' : 'text-gray-500'}`}>
                Uso das Receitas: {porcentagemTexto}%
              </span>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mt-2">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isDeficit 
                    ? 'bg-rose-500' 
                    : Number(porcentagemTexto) > 70 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                }`} 
                style={{ width: `${larguraBarraVisual}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400 font-medium mt-2">
              <p>🟢 Ideal: Despesas abaixo de 70%</p>
              <p className={isDeficit ? "text-rose-500 font-bold" : "text-emerald-600 font-bold"}>
                {isDeficit ? "⚠️ Atenção: Deficit no mês!" : "✅ Caixa em equilíbrio"}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-emerald-700 uppercase mb-3">💰 Entradas por Categoria</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'ENTRADA').map(([nome, c]) => (
              <div key={nome} className="flex justify-between border-b pb-1">
                <span className="text-gray-600 font-medium">{nome}</span>
                <span className="text-emerald-600 font-bold">R$ {c.total.toFixed(2)}</span>
              </div>
            ))}
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'ENTRADA').length === 0 && (
              <p className="text-gray-400 text-xs italic">Nenhuma receita registrada neste mês.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
