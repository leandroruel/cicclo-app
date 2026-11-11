import { useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError } from '../../domain/errors';
import type { LaundryService } from '../../domain/laundryService';
import type { Order } from '../../domain/order';
import { formatCurrency } from '../formatters/currency';
import { useRequestService, useServices, useWallet } from '../hooks/useLaundryData';

interface RequestIntent {
  serviceId: number;
  idempotencyKey: string;
}

function requestErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    if (error.code === 'insufficient_balance') {
      if (error.balance !== undefined && error.required !== undefined) {
        return `Seu saldo é ${formatCurrency(error.balance)} e o serviço custa ${formatCurrency(error.required)}.`;
      }
      return 'O saldo da carteira não cobre o valor deste serviço.';
    }

    if (error.code === 'service_not_found') {
      return 'Este serviço não está mais disponível. Atualize a lista e tente novamente.';
    }

    if (error.code === 'wallet_conflict') {
      return 'O saldo mudou durante a solicitação. Tente novamente com segurança.';
    }

    return error.message;
  }

  if (error instanceof TypeError) {
    return 'Não foi possível conectar à Cicclo. Confira sua conexão e tente novamente.';
  }

  if (error instanceof Error && error.message.includes('EXPO_PUBLIC_API_URL')) {
    return 'A URL da API não está configurada. Defina EXPO_PUBLIC_API_URL e reinicie o Expo.';
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

function serviceIcon(service: LaundryService): string {
  return service.name.toLocaleLowerCase().includes('secag') ? '☀️' : '🫧';
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry}>
        <Text style={styles.retryText}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

export function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const wallet = useWallet();
  const services = useServices();
  const request = useRequestService();
  const [selectedService, setSelectedService] = useState<LaundryService | null>(null);
  const [intent, setIntent] = useState<RequestIntent | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const refresh = () => {
    void Promise.all([wallet.refetch(), services.refetch()]);
  };

  const dismissConfirmation = () => {
    setSelectedService(null);
    setIntent(null);
    request.reset();
  };

  const submitRequest = () => {
    if (!selectedService) return;

    const requestIntent =
      intent ??
      {
        serviceId: selectedService.id,
        idempotencyKey: Crypto.randomUUID(),
      };

    setIntent(requestIntent);
    request.mutate(requestIntent, {
      onSuccess: (order) => {
        setConfirmedOrder(order);
        dismissConfirmation();
      },
    });
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={wallet.isRefetching || services.isRefetching}
            onRefresh={refresh}
            tintColor={colors.purple}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>c</Text>
            </View>
            <Text style={styles.brandName}>cicclo</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>C</Text>
          </View>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>BEM-VINDO À CICCLO</Text>
          <Text style={styles.title}>Cuidado leve,{'\n'}roupa limpa.</Text>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceLabel}>SALDO DA CARTEIRA</Text>
            <View style={styles.walletGlyph}>
              <Text style={styles.walletGlyphText}>R$</Text>
            </View>
          </View>
          {wallet.isPending ? (
            <ActivityIndicator
              accessibilityLabel="Carregando saldo"
              color="#FFFFFF"
              style={styles.balanceLoader}
            />
          ) : wallet.isError ? (
            <Text style={styles.balanceError}>Saldo indisponível</Text>
          ) : (
            <Text style={styles.balanceAmount}>
              {formatCurrency(wallet.data.balance, wallet.data.currency)}
            </Text>
          )}
          <View style={styles.balanceBottomRow}>
            <Text style={styles.balanceCaption}>Disponível para usar</Text>
            <Text style={styles.balanceArrow}>✦</Text>
          </View>
        </View>

        {wallet.isError && (
          <ErrorNotice
            message={requestErrorMessage(wallet.error)}
            onRetry={() => void wallet.refetch()}
          />
        )}

        {confirmedOrder && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Pedido confirmado!</Text>
            <Text style={styles.successText}>
              {confirmedOrder.serviceName} foi adicionado. O saldo atual está no cartão acima.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Serviços disponíveis</Text>
            <Text style={styles.sectionSubtitle}>
              Escolha o que suas roupas precisam.
            </Text>
          </View>
          <View style={styles.sectionAccent}>
            <Text style={styles.sectionAccentText}>✦</Text>
          </View>
        </View>

        {services.isPending ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.purple} />
            <Text style={styles.loadingText}>Buscando serviços...</Text>
          </View>
        ) : services.isError ? (
          <ErrorNotice
            message={requestErrorMessage(services.error)}
            onRetry={() => void services.refetch()}
          />
        ) : services.data.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum serviço disponível</Text>
            <Text style={styles.emptyText}>
              Volte em breve para conferir as opções da Cicclo.
            </Text>
          </View>
        ) : (
          <View style={styles.serviceList}>
            {services.data.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceIcon}>
                  <Text style={styles.serviceEmoji}>{serviceIcon(service)}</Text>
                </View>
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceCaption}>Serviço Cicclo</Text>
                  <Text style={styles.servicePrice}>
                    {formatCurrency(service.price, service.currency)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Solicitar ${service.name} por ${formatCurrency(service.price, service.currency)}`}
                  onPress={() => {
                    setConfirmedOrder(null);
                    setIntent(null);
                    setSelectedService(service);
                    request.reset();
                  }}
                  style={({ pressed }) => [
                    styles.serviceButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.serviceButtonText}>Solicitar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerNote}>
          <Text style={styles.footerSparkle}>✦</Text>
          <Text style={styles.footerText}>Um cuidado de cada vez.</Text>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={selectedService !== null}
        onRequestClose={dismissConfirmation}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalEmoji}>
                {selectedService ? serviceIcon(selectedService) : '🫧'}
              </Text>
            </View>
            <Text style={styles.modalEyebrow}>CONFIRMAR PEDIDO</Text>
            <Text style={styles.modalTitle}>
              {selectedService?.name}
            </Text>
            <Text style={styles.modalDescription}>
              O valor será descontado da sua carteira.
            </Text>
            <View style={styles.modalPriceRow}>
              <Text style={styles.modalPriceLabel}>Total</Text>
              <Text style={styles.modalPrice}>
                {selectedService
                  ? formatCurrency(selectedService.price, selectedService.currency)
                  : ''}
              </Text>
            </View>
            {request.isError && (
              <Text accessibilityRole="alert" style={styles.modalError}>
                {requestErrorMessage(request.error)}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={request.isPending}
              onPress={submitRequest}
              style={({ pressed }) => [
                styles.confirmButton,
                (pressed || request.isPending) && styles.buttonMuted,
              ]}
            >
              {request.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {request.isError ? 'Tentar novamente' : 'Confirmar pedido'}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={request.isPending}
              onPress={dismissConfirmation}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Agora não</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const colors = {
  purple: '#422082',
  deepPurple: '#30145F',
  ink: '#211B2C',
  muted: '#857E91',
  surface: '#F7F5FA',
  border: '#EEEAF3',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 13,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  brandName: {
    color: colors.deepPurple,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: '#EEE7F8',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerBadgeText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '800',
  },
  welcome: {
    marginBottom: 21,
  },
  eyebrow: {
    color: '#947EB5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    marginBottom: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 36,
  },
  balanceCard: {
    backgroundColor: colors.deepPurple,
    borderRadius: 24,
    marginBottom: 24,
    minHeight: 168,
    overflow: 'hidden',
    padding: 21,
  },
  balanceTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    color: '#D5C8EC',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  walletGlyph: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF20',
    borderRadius: 12,
    height: 37,
    justifyContent: 'center',
    width: 42,
  },
  walletGlyphText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 35,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 13,
  },
  balanceLoader: {
    alignSelf: 'flex-start',
    marginTop: 20,
  },
  balanceError: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 18,
  },
  balanceBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  balanceCaption: {
    color: '#D5C8EC',
    fontSize: 12,
  },
  balanceArrow: {
    color: '#D7C6F5',
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: '#FFF4F2',
    borderColor: '#F5D6D1',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  errorText: {
    color: '#8E352B',
    fontSize: 13,
    lineHeight: 19,
  },
  retryText: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  successCard: {
    backgroundColor: '#EAF7EF',
    borderColor: '#D2EEDD',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 23,
    padding: 15,
  },
  successTitle: {
    color: '#22633D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  successText: {
    color: '#39724F',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5,
  },
  sectionAccent: {
    alignItems: 'center',
    backgroundColor: '#EFE8F8',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sectionAccentText: {
    color: colors.purple,
    fontSize: 17,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  serviceList: {
    gap: 12,
  },
  serviceCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 118,
    padding: 14,
  },
  serviceIcon: {
    alignItems: 'center',
    backgroundColor: '#F1ECF8',
    borderRadius: 17,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  serviceEmoji: {
    fontSize: 27,
  },
  serviceDetails: {
    flex: 1,
    marginLeft: 13,
  },
  serviceName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  serviceCaption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  servicePrice: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  serviceButton: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 11,
  },
  serviceButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
  footerNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 25,
  },
  footerSparkle: {
    color: '#8F77B6',
    fontSize: 12,
  },
  footerText: {
    color: '#978FA2',
    fontSize: 11,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: '#1C123080',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 23,
    width: '100%',
  },
  modalIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#F1ECF8',
    borderRadius: 22,
    height: 70,
    justifyContent: 'center',
    marginBottom: 17,
    width: 70,
  },
  modalEmoji: {
    fontSize: 32,
  },
  modalEyebrow: {
    color: '#947EB5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 7,
    textAlign: 'center',
  },
  modalDescription: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 9,
    textAlign: 'center',
  },
  modalPriceRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingVertical: 15,
  },
  modalPriceLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  modalPrice: {
    color: colors.deepPurple,
    fontSize: 17,
    fontWeight: '800',
  },
  modalError: {
    color: '#A33428',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 15,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 50,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonMuted: {
    opacity: 0.7,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    minHeight: 40,
  },
  cancelButtonText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
