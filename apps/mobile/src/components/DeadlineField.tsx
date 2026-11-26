import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { formatDateTime } from '../lib/time';
import { space, TOUCH, useTheme } from '../lib/theme';
import { Label, styles } from './ui';

/** Alegerea termenului: pe Android data și apoi ora (dialoguri native), pe iOS un selector inline. */
export function DeadlineField({ value, onChange, error }: { value: Date; onChange: (d: Date) => void; error?: string }) {
  const { colors, name } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);

  function openAndroid() {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
            if (timeEvent.type === 'set' && time) onChange(time);
          },
        });
      },
    });
  }

  return (
    <View style={{ gap: space.xs }}>
      <Label>Termen</Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Termen: ${formatDateTime(value)}. Apasă pentru a schimba.`}
        onPress={() => (Platform.OS === 'android' ? openAndroid() : setIosOpen((o) => !o))}
        style={[styles.input, { justifyContent: 'center', minHeight: TOUCH, borderColor: error ? colors.blood : colors.line, backgroundColor: colors.bg }]}
      >
        <Text style={{ color: colors.ink, fontSize: 16 }}>⧗ {formatDateTime(value)}</Text>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={value}
          mode="datetime"
          display="inline"
          minimumDate={new Date()}
          themeVariant={name}
          onChange={(_event, date) => date && onChange(date)}
        />
      )}
      {error && <Text style={{ color: colors.blood, fontSize: 14 }}>✖ {error}</Text>}
    </View>
  );
}
