'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');

  async function carregarDados() {
    setLoading(true);
    const { data: t } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)');
    const { data: c } = await supabase.from('categorias').select('*');
    const { data: co } = await supabase.from('contas').select('*');
    if (t) setTransacoes(t);
    if (c) setCategorias(c);
    if (co) setContas(co);
    setLoading(false);
  }
  useEffect(() => { carregarDados(); }, []);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) return alert('Preencha os campos obrigatórios!');
    const { error } = await supabase.from('transacoes').insert([{
      descricao, valor: parseFloat(valor), tipo, categoria_id: parseInt(categoriaId), conta_id: parseInt(contaId), forma_pagamento: formaPagamento, status: 'CONCRETIZADO'
    }]);
    if (error) alert('Erro: ' + error.message);
    else { alert('Sucesso!'); setDescricao(''); setValor(''); setCategoriaId(''); carregarDados(); }
  }

  if (loading) return <div className="p-8 text-center text-gray-600">Carregando dados...</div>;

  const saldoInicialCaixa = 3146.95;
  const saldoInicialBanco = 100675.04;
  
  let entCaixa = 0, saiCaixa = 0, entBanco = 0, saiBanco = 0;
  transacoes.forEach(t => {
    const v = Number(t.valor);
    if (t.tipo === 'ENTRADA') { t.conta_id === 1 ? entCaixa += v : entBanco += v; }
    else { t.conta_id === 1 ? saiCaixa += v : saiBanco += v; }
  });

  const totEntradas = entCaixa + entBanco;
  const totSaidas = saiCaixa + saiBanco;
  const saldoFinal = (saldoInicialCaixa + saldoInicialBanco) + totEntradas - totSaidas;

  const filtrarGrafico = (tFiltro: string) => transacoes.filter(t => t.tipo === tFiltro).reduce((acc: any[], t) => {
    const n = t.categorias?.nome || 'Outros';
    const e = acc.find(i => i.name === n);
    e ? e.value += Number(t.valor) : acc.push({ name: n, value: Number(t.valor) });
    return acc;
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-3xl font-bold text-gray-800 border-b pb-2">Paróquia Santo Expedito</h1>

      <form onSubmit={handleSalvar} className="bg-white p-4 rounded-xl border grid grid-cols-1 md:grid-cols-4 gap-4">
        <select value={tipo} onChange={(e: any) => setTipo(e.target.value)} className="border p-2 rounded text-gray-700"><option value="ENTRADA">ENTRADA</option><option value="SAIDA">SAÍDA</option></select>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="border p-2 rounded text-gray-700"><option value="">Categoria...</option>{categorias.filter(c => c.tipo === tipo).map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}</select>
        <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="border p-2 rounded text-gray-700"><option value="">Conta...</option>{contas.map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}</select>
        <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="border p-2 rounded text-gray-700"><option value="Dinheiro">Dinheiro</option><option value="PIX">PIX</option><option value="Cartão">Cartão</option><option value="Boleto/Transferência">Boleto/Transferência</option></select>
        <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" className="border p-2 rounded text-gray-700 md:col-span-2" />
        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="border p-2 rounded text-gray-700" />
        <button type="submit" className="bg-blue-600 text-white font-bold p-2 rounded hover:bg-blue-700">✨ Registrar</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center font-bold">
        <div className="bg-white p-4 rounded border text-green-600">Entradas: R$ {totEntradas.toFixed(2)}</div>
        <div className="bg-white p-4 rounded border text-red-500">Saídas: R$ {totSaidas.toFixed(2)}</div>
        <div className="bg-white p-4 rounded border text-blue-600 text-xl">Saldo Real: R$ {saldoFinal.toFixed(2)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-semibold">
        <div className="bg-emerald-50 p-4 rounded border text-emerald-800">💵 Caixa Físico | Inicial: R$ {saldoInicialCaixa.toFixed(2)} | Atual: R$ {(saldoInicialCaixa + entCaixa - saiCaixa).toFixed(2)}</div>
        <div className="bg-blue-50 p-4 rounded border text-blue-800">🏦 Banco | Inicial: R$ {saldoInicialBanco.toFixed(2)} | Atual: R$ {(saldoInicialBanco + entBanco - saiBanco).toFixed(2)}</div>
      </div>

      <div className="bg-white p-4 rounded border">
        <h2 className="font-bold mb-2">📊 Histórico de Caixa</h2>
        <table className="w-full text-left text-sm"><thead className="bg-gray-100"><tr><th className="p-2">Descrição</th><th className="p-2">Categoria</th><th className="p-2">Pagamento</th><th className="p-2 text-right">Valor</th></tr></thead><tbody>
          {transacoes.map(t => (<tr key={t.id} className="border-b">
            <td className="p-2 font-medium">{t.descricao}</td>
            <td className="p-2">{t.categorias?.nome}</td>
            <td className="p-2">{t.forma_pagamento}</td>
            <td className={`p-2 text-right font-bold ${t.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-500'}`}>{t.tipo === 'ENTRADA' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}</td>
          </tr>))}
        </tbody></table>
      </div>
    </div>
  );
}