import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { errorMessage } from '../lib/api'
import { TEAM_ROLES, inviteMember, listTeam, removeMember, updateMemberRole } from '../services/teamService'
import { useAuth } from '../context/AuthContext'
import { Avatar, Badge, Button, Card, ChipRow, ErrorState, Loading, Screen, SectionTitle, Text, TextField } from '../components/ui'

export default function TeamScreen() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'Admin'
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: queryKeys.team, queryFn: listTeam })
  const [invite, setInvite] = useState({ name: '', email: '', role: 'Recruiter' })
  const [editing, setEditing] = useState(null)

  const done = () => qc.invalidateQueries({ queryKey: queryKeys.team })
  const fail = (title) => (err) => Alert.alert(title, errorMessage(err))
  const add = useMutation({
    mutationFn: () => inviteMember({ ...invite, name: invite.name.trim(), email: invite.email.trim() }),
    onSuccess: () => {
      setInvite({ name: '', email: '', role: 'Recruiter' })
      done()
    },
    onError: fail('Couldn’t invite'),
  })
  const changeRole = useMutation({ mutationFn: ({ id, role }) => updateMemberRole(id, role), onSuccess: () => { setEditing(null); done() }, onError: fail('Couldn’t change role') })
  const remove = useMutation({ mutationFn: removeMember, onSuccess: done, onError: fail('Couldn’t remove member') })

  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      {data.map((m) => (
        <Card key={m.id}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar name={m.name} />
            <View style={{ flex: 1 }}>
              <Text variant="heading">{m.name}</Text>
              <Text variant="caption">{m.email}</Text>
              <Text variant="caption">Last active {m.lastActive}</Text>
            </View>
            <Badge label={m.status === 'invited' ? 'Invited' : m.role} tone={m.status === 'invited' ? 'amber' : 'navy'} />
          </View>
          {isAdmin && m.id !== user.id ? (
            editing === m.id ? (
              <ChipRow options={TEAM_ROLES} value={m.role} onChange={(role) => changeRole.mutate({ id: m.id, role })} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Change role" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(m.id)} />
                <Button title="Remove" variant="danger" style={{ flex: 1 }} onPress={() => Alert.alert(`Remove ${m.name}?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(m.id) }])} />
              </View>
            )
          ) : null}
        </Card>
      ))}

      {isAdmin ? (
        <>
          <SectionTitle>Invite a teammate</SectionTitle>
          <Card>
            <TextField label="Name" value={invite.name} onChangeText={(name) => setInvite((i) => ({ ...i, name }))} />
            <TextField label="Work email" value={invite.email} onChangeText={(email) => setInvite((i) => ({ ...i, email }))} autoCapitalize="none" keyboardType="email-address" />
            <ChipRow options={TEAM_ROLES} value={invite.role} onChange={(role) => setInvite((i) => ({ ...i, role }))} />
            <Button title="Send invite" loading={add.isPending} disabled={!invite.name.trim() || !invite.email.trim()} onPress={() => add.mutate()} />
          </Card>
        </>
      ) : (
        <Text variant="caption">Only an Admin can invite or remove teammates.</Text>
      )}
    </Screen>
  )
}
