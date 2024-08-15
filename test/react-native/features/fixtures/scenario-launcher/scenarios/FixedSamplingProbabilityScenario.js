import React, { useEffect } from 'react'
import { SafeAreaView, View, Text, StyleSheet } from 'react-native'
import BugsnagPerformance from '@bugsnag/react-native-performance'

export const config = {
  maximumBatchSize: 1,
  autoInstrumentAppStarts: false,
  appVersion: '1.2.3',
  samplingProbability: 1
}

export const App = () => {
  useEffect(() => {
    BugsnagPerformance.startSpan('FixedSamplingProbabilityScenario').end()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scenario}>
        <Text>FixedSamplingProbabilityScenario</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scenario: {
    flex: 1
  }
})
