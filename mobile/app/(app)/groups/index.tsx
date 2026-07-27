import { FlatList, Pressable, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getMyGroups } from '../../../src/api/groups';
import { Button, Card, EmptyState, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';
import { Group } from '../../../src/types/api';

export default function MyGroupsScreen() {
  const { data: groups, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['groups', 'me'],
    queryFn: getMyGroups,
  });

  return (
    <Screen scroll={false}>
      <Stack.Screen
        options={{
          title: 'Meus Grupos',
          headerRight: () => (
            <Pressable onPress={() => router.push('/(app)/profile')}>
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Perfil</Text>
            </Pressable>
          ),
        }}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button label="Criar grupo" onPress={() => router.push('/(app)/groups/create')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Entrar em grupo"
            variant="secondary"
            onPress={() => router.push('/(app)/groups/join')}
          />
        </View>
      </View>

      <FlatList
        data={groups ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState message="Você ainda não participa de nenhum grupo. Crie um ou entre com um código de convite." />
          ) : null
        }
        renderItem={({ item }: { item: Group }) => (
          <Link href={`/(app)/groups/${item.id}`} asChild>
            <Pressable>
              <Card>
                <Title>{item.nome}</Title>
                <Subtitle>
                  {item.tipo === 'PUBLICO' ? 'Grupo público' : 'Grupo privado'} · código{' '}
                  {item.codigoConvite}
                </Subtitle>
              </Card>
            </Pressable>
          </Link>
        )}
      />
    </Screen>
  );
}
