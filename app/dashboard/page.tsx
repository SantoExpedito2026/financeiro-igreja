'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [transacoesFiltradas, setTransacoesFiltradas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'tudo' | 'semana' | 'mes'>('tudo');

  // Estados do Formulário
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().substring(0, 10));
  const [salvando, setSalvando] = useState(false);

  async function carregarDados() {
    setLoading(true);
    const { data: t } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)').order('data_transacao', { ascending: false });
    const { data: c } = await supabase.from('categorias').select('*');
    const { data: co } = await supabase.from('contas').select('*');
    if (t) {
      setTransacoes(t);
      aplicarFiltro(t, filtroPeriodo);
    }
    if (c) setCategorias(c);
    if (co) setContas(co);
    setLoading(false);
  }

  function aplicarFiltro(dados: any[], periodo: 'tudo' | 'semana' | 'mes') {
    const hoje = new Date();
    if (periodo === 'tudo') {
      setTransacoesFiltradas(dados);
    } else if (periodo === 'semana') {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 7);
      const filtrado = dados.filter(t => new Date(t.data_transacao + 'T00:00:00') >= seteDiasAtras);
      setTransacoesFiltradas(filtrado);
    } else if (periodo === 'mes') {
      const filtrado = dados.filter(t => {
        const dataT = new Date(t.data_transacao + 'T00:00:00');
        return dataT.getMonth() === hoje.getMonth() && dataT.getFullYear() === hoje.getFullYear();
      });
      setTransacoesFiltradas(filtrado);
    }
  }

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => { aplicarFiltro(transacoes, filtroPeriodo); }, [filtroPeriodo, transacoes]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) return alert('Preencha os campos obrigatórios!');
    setSalvando(true);
    const { error } = await supabase.from('transacoes').insert([{
      descricao, valor: parseFloat(valor), tipo, categoria_id: parseInt(categoriaId), conta_id: parseInt(contaId), forma_pagamento: formaPagamento, data_transacao: dataTransacao, status: 'CONCRETIZADO'
    }]);
    setSalvando(false);
    if (error) alert('Erro: ' + error.message);
    else { alert('Sucesso!'); setDescricao(''); setValor(''); setCategoriaId(''); carregarDados(); }
  }

  if (loading) return <div className="p-8 text-center text-gray-600 font-semibold">Carregando dados da Paróquia...</div>;

  // VALORES REAIS FIEDIGNOS FIXOS
  const saldoInicialCaixa = 3146.95;
  const saldoInicialBanco = 100675.04;
  const saldoInicialTotal = saldoInicialCaixa + saldoInicialBanco;
  
  // Cálculos baseados no período FILTRADO para os cards e gráficos
  let entCaixa = 0, saiCaixa = 0, entBanco = 0, saiBanco = 0;
  transacoesFiltradas.forEach(t => {
    const v = Number(t.valor);
    if (t.tipo === 'ENTRADA') { t.conta_id === 1 ? entCaixa += v : entBanco += v; }
    else { t.conta_id === 1 ? saiCaixa += v : saiBanco += v; }
  });

  const totEntradas = entCaixa + entBanco;
  const totSaidas = saiCaixa + saiBanco;
  
  // Saldo Final acumulado considera o Saldo Inicial histórico + movimentações filtradas
  const saldoFinalTotal = saldoInicialTotal + totEntradas - totSaidas;

  const dadosPizzaEntradas = transacoesFiltradas.filter(t => t.tipo === 'ENTRADA').reduce((acc: any[], t) => {
    const n = t.categorias?.nome || 'Outros';
    const e = acc.find(i => i.name === n);
    e ? e.value += Number(t.valor) : acc.push({ name: n, value: Number(t.valor) });
    return acc;
  }, []);

  const dadosPizzaSaidas = transacoesFiltradas.filter(t => t.tipo === 'SAIDA').reduce((acc: any[], t) => {
    const n = t.categorias?.nome || 'Outros';
    const e = acc.find(i => i.name === n);
    e ? e.value += Number(t.valor) : acc.push({ name: n, value: Number(t.valor) });
    return acc;
  }, []);

  const CORES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#EF4444', '#EC4899'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Paróquia Santo Expedito</h1>
          <p className="text-gray-500 text-sm">Painel de Gestão, Lançamentos e Fluxo de Caixa</p>
        </div>
        {/* BOTÕES DE FILTRO DE DATA */}
        <div className="flex gap-2 bg-gray-200 p-1 rounded-lg self-start md:self-center">
          <button onClick={() => setFiltroPeriodo('tudo')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${filtroPeriodo === 'tudo' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Tudo</button>
          <button onClick={() => setFiltroPeriodo('semana')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${filtroPeriodo === 'semana' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Esta Semana</button>
          <button onClick={() => setFiltroPeriodo('mes')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${filtroPeriodo === 'mes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Este Mês</button>
        </div>
      </div>

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">📝 Novo Lançamento Paroquial</h2>
        <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Movimento</label>
            <select value={tipo} onChange={(e: any) => { setTipo(e.target.value); setCategoriaId(''); }} className="w-full border p-2 rounded-lg bg-gray-50 text-gray-700"><option value="ENTRADA">ENTRADA (Receitas)</option><option value="SAIDA">SAIDA (Despesas)</option></select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Categoria Paroquial</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 text-gray-700"><option value="">Selecione...</option>{categorias.filter(c => c.tipo === tipo).map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Conta Destino/Origem</label>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 text-gray-700"><option value="">Selecione...</option>{contas.map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Forma de Pagamento</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 text-gray-700"><option value="Dinheiro">Dinheiro</option><option value="PIX">PIX</option><option value="Cartão">Cartão</option><option value="Boleto/Transferência">Boleto/Transferência</option></select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome / Observação / Descrição</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Dízimo Família Silva" className="w-full border p-2 rounded-lg text-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Valor (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full border p-2 rounded-lg text-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data da Transação</label>
            <input type="date" value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="w-full border p-2 rounded-lg text-gray-700" />
          </div>
          <div className="md:col-span-3 lg:col-span-4 flex justify-end pt-2">
            <button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-gray-400">{salvando ? 'Salvando...' : '✨ Registrar no Fluxo'}</button>
          </div>
        </form>
      </div>

      {/* CARDS GERAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center font-bold">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-400 uppercase">Saldo Inicial Total</p>
          <p className="text-xl text-gray-700">R$ {saldoInicialTotal.toFixed(2)}</p>
        </div>
