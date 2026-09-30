import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { io } from 'socket.io-client';
import { unitsAPI, alertsAPI } from '../services/api';

const socket = io('https://api.smartsolhub.co.zw');

export default function HomeScreen({ navigation }) {
  const [unit, setUnit] = useState(null);
  const [live, setLive] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    const [uRes, aRes] = await Promise.all([unitsAPI.list(), alertsAPI.list()]);
    if (uRes.data[0]) {
      setUnit(uRes.data[0]);
      setLive(uRes.data[0]);
      socket.emit('subscribe_unit', uRes.data[0].id);
    }
    setAlerts(aRes.data.slice(0, 3));
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    socket.on('telemetry', data => setLive(prev => ({ ...prev, ...data })));
    return () => socket.off('telemetry');
  }, []);

  const socColor = soc => soc > 50 ? '#22c55e' : soc > 20 ? '#f59e0b' : '#ef4444';

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={s.header}>⚡ SmartSol Energy</Text>

      {/* Battery Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Battery Status</Text>
        <View style={s.batteryBar}>
          <View style={[s.batteryFill, { width: `${live.battery_soc ?? 0}%`, backgroundColor: socColor(live.battery_soc) }]} />
        </View>
        <Text style={[s.bigValue, { color: socColor(live.battery_soc) }]}>{live.battery_soc ?? '--'}%</Text>
        <Text style={s.subText}>{live.battery_voltage ?? '--'}V · {live.battery_temp ?? '--'}°C</Text>
      </View>

      {/* Solar & Load */}
      <View style={s.row}>
        <View style={[s.card, s.halfCard]}>
          <Text style={s.cardTitle}>☀️ Solar</Text>
          <Text style={[s.bigValue, { color: '#f59e0b' }]}>{live.solar_power_w ?? '--'}</Text>
          <Text style={s.subText}>Watts</Text>
        </View>
        <View style={[s.card, s.halfCard]}>
          <Text style={s.cardTitle}>🔌 Load</Text>
          <Text style={[s.bigValue, { color: '#60a5fa' }]}>{live.load_power_w ?? '--'}</Text>
          <Text style={s.subText}>Watts</Text>
        </View>
      </View>

      {/* Buy Energy Button */}
      <TouchableOpacity style={s.buyBtn} onPress={() => navigation.navigate('BuyEnergy')}>
        <Text style={s.buyBtnText}>💳 Buy Energy (Pay-As-You-Go)</Text>
      </TouchableOpacity>

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>⚠️ Alerts</Text>
          {alerts.map(a => (
            <View key={a.id} style={[s.alertRow, { borderLeftColor: a.severity === 'critical' ? '#ef4444' : '#f59e0b' }]}>
              <Text style={s.alertText}>{a.message}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { fontSize: 22, fontWeight: '700', color: '#f59e0b', marginBottom: 20, marginTop: 8 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 14 },
  halfCard: { flex: 1, marginHorizontal: 4 },
  row: { flexDirection: 'row', marginHorizontal: -4 },
  cardTitle: { fontSize: 13, color: '#94a3b8', marginBottom: 10 },
  bigValue: { fontSize: 36, fontWeight: '700', color: '#f1f5f9' },
  subText: { fontSize: 13, color: '#64748b', marginTop: 4 },
  batteryBar: { height: 12, backgroundColor: '#334155', borderRadius: 6, marginBottom: 10, overflow: 'hidden' },
  batteryFill: { height: '100%', borderRadius: 6 },
  buyBtn: { backgroundColor: '#f59e0b', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 },
  buyBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
  alertRow: { borderLeftWidth: 3, paddingLeft: 10, marginBottom: 8 },
  alertText: { color: '#cbd5e1', fontSize: 13 },
});
