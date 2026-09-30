import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import BuyEnergyScreen from './src/screens/BuyEnergyScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
      tabBarActiveTintColor: '#f59e0b',
      tabBarInactiveTintColor: '#64748b',
      headerStyle: { backgroundColor: '#1e293b' },
      headerTintColor: '#f1f5f9',
    }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '⚡ Home' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={HomeTabs} />
        <Stack.Screen name="BuyEnergy" component={BuyEnergyScreen}
          options={{ headerShown: true, title: 'Buy Energy',
            headerStyle: { backgroundColor: '#1e293b' }, headerTintColor: '#f1f5f9' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
