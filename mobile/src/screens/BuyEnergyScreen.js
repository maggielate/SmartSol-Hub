import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { paymentsAPI, unitsAPI } from '../services/api';

const RATE = 0.12; // $0.12 per kWh

export default function BuyEnergyScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ecocash');
  const [loading, setLoading] = useState(false);

  const kwh = amount ? (parseFloat(amount) / RATE).toFixed(2) : '0.00';

  async function handlePurchase() {
    if (!amount || parseFloat(amount) < 1) {
      Alert.alert('Invalid Amount', 'Minimum purchase is $1.00');
      return;
    }
    setLoading(true);
    try {
      const units = await unitsAPI.list();
      const unitId = units.data[0]?.id;
      if (!unitId) throw new Error('No unit linked to account');

      const { data } = await paymentsAPI.initiate({
        unit_id: unitId,
        amount_usd: parseFloat(amount),
        payment_method: method,
      });

      Alert.alert(
        'Payment Initiated! ✅',
        `You will receive a ${method === 'ecocash' ? 'EcoCash' : 'OneMoney'} prompt.\n\nRef: ${data.payment_ref}\nEnergy: ${data.kwh_purchased} kWh`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Payment Failed', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>💳 Buy Energy</Text>
      <Text style={s.rate}>Rate: $0.12 / kWh</Text>

      <View style={s.card}>
        <Text style={s.label}>Amount (USD)</Text>
        <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 5.00"
          placeholderTextColor="#64748b" value={amount} onChangeText={setAmount} />
        <Text style={s.kwh}>≈ {kwh} kWh of energy</Text>
      </View>

      <View style={s.card}>
        <Text style={s.label}>Payment Method</Text>
        <View style={s.methodRow}>
          {['ecocash', 'onemoney'].map(m => (
            <TouchableOpacity key={m} onPress={() => setMethod(m)}
              style={[s.methodBtn, method === m && s.methodBtnActive]}>
              <Text style={[s.methodText, method === m && s.methodTextActive]}>
                {m === 'ecocash' ? '🟢 EcoCash' : '🔵 OneMoney'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.summary}>
        <Text style={s.summaryText}>Total: <Text style={s.summaryValue}>${parseFloat(amount || 0).toFixed(2)}</Text></Text>
        <Text style={s.summaryText}>Energy: <Text style={s.summaryValue}>{kwh} kWh</Text></Text>
      </View>

      <TouchableOpacity style={[s.payBtn, loading && { opacity: 0.6 }]} onPress={handlePurchase} disabled={loading}>
        {loading ? <ActivityIndicator color="#0f172a" /> :
          <Text style={s.payBtnText}>Pay with {method === 'ecocash' ? 'EcoCash' : 'OneMoney'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#f59e0b', marginBottom: 4 },
  rate: { color: '#64748b', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 14 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: '#334155', borderRadius: 8, padding: 12, color: '#f1f5f9', fontSize: 20, fontWeight: '600' },
  kwh: { color: '#22c55e', marginTop: 8, fontSize: 14 },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#334155', alignItems: 'center' },
  methodBtnActive: { backgroundColor: '#f59e0b' },
  methodText: { color: '#94a3b8', fontWeight: '600' },
  methodTextActive: { color: '#0f172a' },
  summary: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20 },
  summaryText: { color: '#94a3b8', fontSize: 15, marginBottom: 6 },
  summaryValue: { color: '#f1f5f9', fontWeight: '700' },
  payBtn: { backgroundColor: '#f59e0b', borderRadius: 12, padding: 16, alignItems: 'center' },
  payBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
