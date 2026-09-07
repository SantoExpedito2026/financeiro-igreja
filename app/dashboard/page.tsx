'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface Transacao {
  id: number;
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: 'ENTRADA' | 'SAIDA';
  forma_pagamento: string;
  status: string;
  conta_id: number;
  categoria_id: number;
  categorias: { nome: string } | null;
  contas: { nome: string } | null;
}

interface Categoria {
  id: number;
  nome: string;
  tipo: 'ENTRADA' | 'SAIDA';
}

interface Conta {
  id: number;
  nome: string;
}

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

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
    const { data: tData } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)').order('data_transacao', { ascending: false });
    const { data: cData } = await supabase.from('categorias').select('*').order('nome');
    const { data: coData } = await supabase.from('contas').select('*').order('nome');

    if (tData) setTransacoes(tData as any);
    if (cData) setCategorias(cData);
    if (coData) setContas(coData);
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) {
      alert('Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.from('transacoes').insert([{
      descricao,
      valor: parseFloat(valor),
      tipo,
      categoria_id: parseInt(categoriaId),
      conta_id: parseInt(contaId),
      forma_pagamento: formaPagamento,
      data_transacao: dataTransacao,
      status: 'CONCRETIZADO'
    }]);

    if (error) {
      alert('Erro ao salvar no banco de dados: ' + error.message);
    } else {
      alert('Lançamento paroquial registrado com sucesso!');
      setDescricao('');
      setValor('');
      setCategoriaId('');
      carregarDados();
    }
    setSalvando(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-600 font-semibold">Carregando dados da Paróquia...</div>;

  // VALORES REAIS FIEDIGNOS LANÇADOS DIRETAMENTE NO MOTOR DO SITE
  const saldoInicialCaixa = 3146.95;    // Seu valor fidedigno de Caixa Físico
  const saldoInicialBanco = 100675.04;  // Seu valor fidedigno de Conta Bancária
  const saldoInicialTotal = saldoInicialCaixa + saldoInicialBanco;
  
  let entradasCaixa = 0, saidasCaixa = 0;
  let entradasBanco = 0, saidasBanco = 0;

  transacoes.forEach(t => {
    const v = Number(t.valor);
    if (t.tipo === 'ENTRADA') {
      if (t.conta_id === 1) entradasCaixa += v;
      else entradasBanco += v;
    } else {
      if (t.conta_id === 1) saidasCaixa += v;
      else saidasBanco += v;
    }
  });

  const totalEntradasGlobal = entradasCaixa + entradasBanco;
  const totalSaidasGlobal = saidasCaixa + saidasBanco;
  const saldoFinalGlobal = saldoInicialTotal + totalEntradasGlobal - totalSaidasGlobal;

  const dadosEntradas = transacoes
    .filter(t => t.tipo === 'ENTRADA')
    .reduce((acc: any[], atual) => {
      const nomeCategoria = atual.categorias?.nome || 'Outros';
      const existente = acc.find(item => item.name === nomeCategoria);
      if (existente) existente.value += Number(atual.valor);
      else acc.push({ name: nomeCategoria, value: Number(atual.valor) });
      return acc;
    }, []);

  const dadosSaidas = transacoes
    .filter(t => t.tipo === 'SAIDA')
    .reduce((acc: any[], atual) => {
      const nomeCategoria = atual.categorias?.nome || 'Outros';
      const existente = acc.find(item => item.name === nomeCategoria);
      if (existente) existente.value += Number(atual.valor);
      else acc.push({ name: nomeCategoria, value: Number(atual.valor) });
      return acc;
    }, []);

  const dadosBarras = [{ name: 'Balanço Paroquial', Entradas: totalEntradasGlobal, Saídas: totalSaidasGlobal }];
  const CORES_ENTRADAS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const CORES_SAIDAS = ['#EF4444', '#F97316', '#F59E0B', '#6366F1', '#EC4899'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Paróquia Santo Expedito</h1>
        <p className="text-gray-500 text-sm">Painel de Gestão, Lançamentos e Fluxo de Caixa</p>
      </div>

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">📝 Novo Lançamento Paroquial</h2>
        <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Movimento</label>
            <select value={tipo} onChange={(e) => { setTipo(e.target.value as any); setCategoriaId(''); }} className="w-full border border-gray-300 p-2 rounded-lg bg-gray-50 text-gray-700">
              <option value="ENTRADA">ENTRADA (Receitas/Dízimos)</option>
              <option value="SAIDA">SAIDA (Despesas/Custos)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Categoria Paroquial</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-gray-50 text-gray-700">
              <option value="">Selecione uma option...</option>
              {categorias.filter(c => c.tipo === tipo).map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Conta de Origem/Destino</label>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-gray-50 text-gray-700">
              <option value="">Selecione a conta...</option>
              {contas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Forma de Pagamento</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg bg-gray-50 text-gray-700">
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Boleto/Transferência">Boleto/Transferência</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome / Observação / Descrição</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Dízimo Família Silva" className="w-full border border-gray-300 p-2 rounded-lg text-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Valor (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full border border-gray-300 p-2 rounded-lg text-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data da Transação</label>
            <input type="date" value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-gray-700" />
          </div>
          <div className="md:col-span-3 lg:col-span-4 flex justify-end pt-2">
            <button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-gray-400">
              {salvando ? 'Salvando lançamento...' : '✨ Registrar no Fluxo de Caixa'}
            </button>
          </div>
        </form>
      </div>

      {/* CARDS GERAIS DE CONSOLIDADO PAROQUIAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase">Saldo Inicial Total</p>
          <p className="text-xl font-bold text-gray-700">R$ {saldoInicialTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total Entradas (+)</p>
          <p className="text-xl font-bold text-green-600">R$ {totalEntradasGlobal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500">
