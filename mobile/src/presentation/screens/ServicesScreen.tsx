import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  Plus,
  Wallet,
  X,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';
import {
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError } from '../../domain/errors';
import type { LaundryService } from '../../domain/laundryService';
import { formatCurrency } from '../formatters/currency';
import {
  useCreditWallet,
  useRequestService,
  useServices,
  useWallet,
  useWalletTransactions,
} from '../hooks/useLaundryData';

interface RequestIntent {
  serviceId: number;
  idempotencyKey: string;
}

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  message: string;
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

function serviceIcon(service: LaundryService): number {
  const name = service.name.toLocaleLowerCase();
  return name.includes('pass') || name.includes('secag')
    ? require('../../../assets/ironing.png')
    : require('../../../assets/laundry.png');
}

function ToastBanner({
  toast,
  top,
  onDismiss,
}: {
  toast: ToastMessage;
  top: number;
  onDismiss: () => void;
}) {
  const [translateY] = useState(() => new Animated.Value(-100));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    return () => {
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [opacity, translateY]);

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.toast,
        toast.type === 'success' ? styles.toastSuccess : styles.toastError,
        { top, opacity, transform: [{ translateY }] },
      ]}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 color={colors.toastSuccessIcon} size={22} />
      ) : (
        <CircleAlert color={colors.toastErrorIcon} size={22} />
      )}
      <Text style={styles.toastMessage}>{toast.message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar notificação"
        hitSlop={8}
        onPress={onDismiss}
        style={styles.toastDismiss}
      >
        <X color={colors.muted} size={18} />
      </Pressable>
    </Animated.View>
  );
}

function SkeletonBlock({ style }: { style: ViewStyle }) {
  const [opacity] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBlock, style, { opacity }]} />;
}

function ServiceCardSkeleton({ alternate = false }: { alternate?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.serviceCard, alternate && styles.serviceCardAlternate]}
    >
      <SkeletonBlock style={styles.serviceIconSkeleton} />
      <SkeletonBlock style={styles.serviceNameSkeleton} />
      <SkeletonBlock style={styles.serviceAvailabilitySkeleton} />
      <View style={styles.serviceBottomRow}>
        <SkeletonBlock style={styles.servicePriceSkeleton} />
        <SkeletonBlock style={styles.serviceArrowSkeleton} />
      </View>
    </View>
  );
}

function TransactionSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.transactionCard}
    >
      <SkeletonBlock style={styles.transactionIconSkeleton} />
      <View style={styles.transactionSkeletonDetails}>
        <SkeletonBlock style={styles.transactionTitleSkeleton} />
        <SkeletonBlock style={styles.transactionDateSkeleton} />
        <SkeletonBlock style={styles.transactionBalanceSkeleton} />
      </View>
      <SkeletonBlock style={styles.transactionAmountSkeleton} />
    </View>
  );
}

export function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const servicesOffset = useRef(0);
  const wallet = useWallet();
  const services = useServices();
  const [walletHistoryVisible, setWalletHistoryVisible] = useState(false);
  const transactions = useWalletTransactions(walletHistoryVisible);
  const request = useRequestService();
  const credit = useCreditWallet();
  const [selectedService, setSelectedService] = useState<LaundryService | null>(null);
  const [intent, setIntent] = useState<RequestIntent | null>(null);
  const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [selectedCreditAmount, setSelectedCreditAmount] = useState(25);
  const [creditIntent, setCreditIntent] = useState<{
    amount: number;
    idempotencyKey: string;
  } | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = () => {
    void Promise.all([
      wallet.refetch(),
      services.refetch(),
      transactions.refetch(),
    ]);
  };

  const refreshWalletHistory = () => {
    void Promise.all([wallet.refetch(), transactions.refetch()]);
  };

  const dismissToast = useCallback(() => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (type: ToastMessage['type'], message: string) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ id: ++toastId.current, type, message });
      toastTimer.current = setTimeout(dismissToast, 3500);
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (wallet.isError) showToast('error', requestErrorMessage(wallet.error));
  }, [showToast, wallet.error, wallet.isError]);

  useEffect(() => {
    if (services.isError) showToast('error', requestErrorMessage(services.error));
  }, [services.error, services.isError, showToast]);

  useEffect(() => {
    if (request.isError) showToast('error', requestErrorMessage(request.error));
  }, [request.error, request.isError, showToast]);

  useEffect(() => {
    if (credit.isError) showToast('error', requestErrorMessage(credit.error));
  }, [credit.error, credit.isError, showToast]);

  useEffect(() => {
    if (transactions.isError) {
      showToast('error', requestErrorMessage(transactions.error));
    }
  }, [showToast, transactions.error, transactions.isError]);

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
        showToast('success', `Pedido de ${order.serviceName} confirmado.`);
        dismissConfirmation();
      },
    });
  };

  const openCreditModal = () => {
    setSelectedCreditAmount(25);
    setCreditIntent(null);
    credit.reset();
    setCreditModalVisible(true);
  };

  const dismissCreditModal = () => {
    setCreditModalVisible(false);
    setCreditIntent(null);
    credit.reset();
  };

  const submitCredit = () => {
    const requestIntent =
      creditIntent ??
      {
        amount: selectedCreditAmount,
        idempotencyKey: Crypto.randomUUID(),
      };

    setCreditIntent(requestIntent);
    credit.mutate(requestIntent, {
      onSuccess: () => {
        showToast(
          'success',
          `Crédito de ${formatCurrency(requestIntent.amount)} adicionado ao saldo.`,
        );
        dismissCreditModal();
      },
    });
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 112 + Math.max(insets.bottom, 12) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              wallet.isRefetching ||
              services.isRefetching ||
              transactions.isRefetching
            }
            onRefresh={refresh}
            tintColor={colors.purple}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <Text style={styles.brandName}>cicclo</Text>
            <Text style={styles.brandSparkle}>✦</Text>
          </View>
          <View style={styles.location}>
            <Text style={styles.locationLabel}>UNIDADE ATUAL</Text>
            <View style={styles.locationValueRow}>
              <Text style={styles.locationPin}>⌖</Text>
              <Text style={styles.locationValue}>Lavanderia Cicclo</Text>
              <Text style={styles.locationChevron}>›</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>C</Text>
          </View>
          <View style={styles.greeting}>
            <Text style={styles.greetingTitle}>Olá, bem-vindo!</Text>
            <Text style={styles.greetingSubtitle}>Seu cuidado começa aqui.</Text>
          </View>
          <View style={styles.profileAction}>
            <Text style={styles.profileActionText}>✦</Text>
          </View>
        </View>

        <View style={styles.balanceRow}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceTextGroup}>
              <Text style={styles.balanceLabel}>MEU SALDO</Text>
              {wallet.isPending ? (
                <SkeletonBlock style={styles.balanceSkeleton} />
              ) : wallet.isError ? (
                <Text style={styles.balanceError}>Indisponível</Text>
              ) : (
                <Text style={styles.balanceAmount}>
                  {balanceVisible
                    ? formatCurrency(wallet.data.balance, wallet.data.currency)
                    : 'R$ •••,••'}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'}
              onPress={() => setBalanceVisible((visible) => !visible)}
              style={styles.balanceVisibility}
            >
              {balanceVisible ? (
                <Eye color={colors.purple} size={19} strokeWidth={1.8} />
              ) : (
                <EyeOff color={colors.purple} size={19} strokeWidth={1.8} />
              )}
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar saldo"
            onPress={openCreditModal}
            style={({ pressed }) => [styles.addBalanceIcon, pressed && styles.pressed]}
          >
            <Plus color="#FFFFFF" size={23} strokeWidth={2} />
          </Pressable>
        </View>

        {(wallet.isPending || services.isPending) && (
          <View
            accessibilityLiveRegion="polite"
            style={styles.connectionStatus}
          >
            <ActivityIndicator color={colors.purple} size="small" />
            <Text style={styles.connectionStatusText}>
              {Math.max(wallet.failureCount, services.failureCount) > 0
                ? 'A API está demorando. Tentando novamente…'
                : 'Conectando à API…'}
            </Text>
          </View>
        )}

        <View
          style={styles.section}
          onLayout={(event) => {
            servicesOffset.current = event.nativeEvent.layout.y;
          }}
        >
          {walletHistoryVisible ? (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>SUA CONTA</Text>
                  <Text style={styles.sectionTitle}>Histórico da carteira</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Atualizar histórico"
                  onPress={refreshWalletHistory}
                  style={styles.refreshButton}
                >
                  <Text style={styles.refreshButtonText}>↻</Text>
                </Pressable>
              </View>
              {transactions.isPending ? (
                <View style={styles.transactionList}>
                  <TransactionSkeleton />
                  <TransactionSkeleton />
                  <TransactionSkeleton />
                </View>
              ) : transactions.isError ? (
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingText}>Não foi possível carregar o histórico.</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void transactions.refetch()}
                  >
                    <Text style={styles.retryText}>Tentar novamente</Text>
                  </Pressable>
                </View>
              ) : transactions.data.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Wallet color={colors.purple} size={27} />
                  <Text style={styles.emptyTitle}>Nenhuma transação ainda</Text>
                  <Text style={styles.emptyText}>
                    Seus créditos e serviços utilizados aparecerão aqui.
                  </Text>
                </View>
              ) : (
                <View style={styles.transactionList}>
                  {transactions.data.map((transaction) => {
                    const isCredit = transaction.type === 'Credit';
                    const transactionDate = new Date(transaction.createdAt);
                    return (
                      <View key={transaction.id} style={styles.transactionCard}>
                        <View
                          style={[
                            styles.transactionIcon,
                            isCredit
                              ? styles.transactionCreditIcon
                              : styles.transactionDebitIcon,
                          ]}
                        >
                          {isCredit ? (
                            <ArrowDownLeft color={colors.credit} size={20} />
                          ) : (
                            <ArrowUpRight color={colors.debit} size={20} />
                          )}
                        </View>
                        <View style={styles.transactionDetails}>
                          <Text style={styles.transactionTitle}>
                            {isCredit ? 'Crédito adicionado' : 'Serviço utilizado'}
                          </Text>
                          <Text style={styles.transactionDate}>
                            {transactionDate.toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </Text>
                          <Text style={styles.transactionBalance}>
                            Saldo após: {formatCurrency(transaction.balanceAfter)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.transactionAmount,
                            isCredit
                              ? styles.transactionAmountCredit
                              : styles.transactionAmountDebit,
                          ]}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>CUIDADO CICCLO</Text>
                  <Text style={styles.sectionTitle}>Serviços disponíveis</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Atualizar serviços"
                  onPress={refresh}
                  style={styles.refreshButton}
                >
                  <Text style={styles.refreshButtonText}>↻</Text>
                </Pressable>
              </View>

              {services.isPending ? (
                <View style={styles.serviceGrid}>
                  <ServiceCardSkeleton />
                  <ServiceCardSkeleton alternate />
                </View>
              ) : services.isError ? (
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingText}>Serviços indisponíveis.</Text>
                  <Pressable accessibilityRole="button" onPress={() => void services.refetch()}>
                    <Text style={styles.retryText}>Tentar novamente</Text>
                  </Pressable>
                </View>
              ) : services.data.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Nenhum serviço disponível</Text>
                  <Text style={styles.emptyText}>
                    Volte em breve para conferir as opções da Cicclo.
                  </Text>
                </View>
              ) : (
                <View style={styles.serviceGrid}>
                  {services.data.map((service, index) => (
                    <Pressable
                      key={service.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Solicitar ${service.name} por ${formatCurrency(service.price, service.currency)}`}
                      onPress={() => {
                        setIntent(null);
                        setSelectedService(service);
                        request.reset();
                      }}
                      style={({ pressed }) => [
                        styles.serviceCard,
                        index % 2 === 1 && styles.serviceCardAlternate,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.serviceIcon,
                          index % 2 === 1 && styles.serviceIconAlternate,
                        ]}
                      >
                        <Image
                          accessibilityLabel={service.name}
                          resizeMode="contain"
                          source={serviceIcon(service)}
                          style={styles.serviceImage}
                        />
                      </View>
                      <Text numberOfLines={1} style={styles.serviceName}>
                        {service.name}
                      </Text>
                      <Text style={styles.serviceAvailability}>Disponível agora</Text>
                      <View style={styles.serviceBottomRow}>
                        <Text style={styles.servicePrice}>
                          {formatCurrency(service.price, service.currency)}
                        </Text>
                        <Text style={styles.serviceArrow}>›</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBarWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Início"
            onPress={() => {
              setWalletHistoryVisible(false);
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            style={styles.navItem}
          >
            <Text style={[styles.navIcon, styles.navIconActive]}>⌂</Text>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Início</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir para serviços"
            onPress={() =>
              {
                setWalletHistoryVisible(false);
                scrollRef.current?.scrollTo({ y: servicesOffset.current, animated: true });
              }
            }
            style={styles.navItem}
          >
            <Text style={styles.navIcon}>▦</Text>
            <Text style={styles.navLabel}>Serviços</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Carteira e histórico de transações"
            accessibilityState={{ selected: walletHistoryVisible }}
            onPress={() => {
              setWalletHistoryVisible(true);
            }}
            style={styles.navItem}
          >
            <Wallet
              color={walletHistoryVisible ? colors.purple : colors.navMuted}
              size={20}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.navLabel,
                walletHistoryVisible && styles.navLabelActive,
              ]}
            >
              Carteira
            </Text>
          </Pressable>
        </View>
      </View>

      {toast && selectedService === null && !creditModalVisible && (
        <ToastBanner key={toast.id} toast={toast} top={10} onDismiss={dismissToast} />
      )}

      <Modal
        animationType="fade"
        transparent
        visible={selectedService !== null}
        onRequestClose={dismissConfirmation}
      >
        <View style={styles.modalBackdrop}>
          {toast?.type === 'error' && (
            <ToastBanner
              key={toast.id}
              toast={toast}
              top={insets.top + 10}
              onDismiss={dismissToast}
            />
          )}
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              {selectedService && (
                <Image
                  accessibilityLabel={selectedService.name}
                  resizeMode="contain"
                  source={serviceIcon(selectedService)}
                  style={styles.modalImage}
                />
              )}
            </View>
            <Text style={styles.modalEyebrow}>CONFIRMAR PEDIDO</Text>
            <Text style={styles.modalTitle}>{selectedService?.name}</Text>
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

      <Modal
        animationType="fade"
        transparent
        visible={creditModalVisible}
        onRequestClose={dismissCreditModal}
      >
        <View style={styles.modalBackdrop}>
          {toast?.type === 'error' && (
            <ToastBanner
              key={toast.id}
              toast={toast}
              top={insets.top + 10}
              onDismiss={dismissToast}
            />
          )}
          <View style={styles.modalCard}>
            <View style={styles.creditModalIcon}>
              <Plus color={colors.purple} size={25} strokeWidth={2} />
            </View>
            <Text style={styles.modalEyebrow}>ADICIONAR SALDO</Text>
            <Text style={styles.modalTitle}>Escolha um valor</Text>
            <Text style={styles.modalDescription}>
              Selecione quanto deseja adicionar à carteira.
            </Text>
            <View style={styles.creditAmounts}>
              {[10, 25, 50].map((amount) => {
                const selected = selectedCreditAmount === amount;
                return (
                  <Pressable
                    key={amount}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={formatCurrency(amount)}
                    disabled={credit.isPending}
                    onPress={() => {
                      setSelectedCreditAmount(amount);
                      setCreditIntent(null);
                      credit.reset();
                    }}
                    style={[
                      styles.creditAmountOption,
                      selected && styles.creditAmountOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.creditAmountText,
                        selected && styles.creditAmountTextSelected,
                      ]}
                    >
                      {formatCurrency(amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.creditSimulationNote}>
              Crédito de demonstração: não há cobrança nem pagamento real.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={credit.isPending}
              onPress={submitCredit}
              style={({ pressed }) => [
                styles.confirmButton,
                (pressed || credit.isPending) && styles.buttonMuted,
              ]}
            >
              {credit.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {credit.isError
                    ? 'Tentar novamente'
                    : `Adicionar ${formatCurrency(selectedCreditAmount)}`}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={credit.isPending}
              onPress={dismissCreditModal}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const colors = {
  purple: '#501779',
  deepPurple: '#35104F',
  ink: '#292A31',
  muted: '#888991',
  surface: '#FAFAFB',
  border: '#EFEEF1',
  green: '#37863F',
  credit: '#278248',
  debit: '#C64B3F',
  creditBackground: '#EAF7EF',
  debitBackground: '#FFF0ED',
  navMuted: '#A8A6AE',
  toastSuccessBackground: '#F0FAF3',
  toastSuccessBorder: '#CDEBD5',
  toastSuccessIcon: '#278248',
  toastErrorBackground: '#FFF5F3',
  toastErrorBorder: '#F2D1CB',
  toastErrorIcon: '#C64B3F',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 7,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#F0EFF2',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 55,
    paddingBottom: 10,
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandName: {
    color: colors.purple,
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  brandSparkle: {
    color: colors.purple,
    fontSize: 12,
    marginLeft: 1,
    marginTop: 11,
  },
  location: {
    alignItems: 'flex-end',
  },
  locationLabel: {
    color: '#96949B',
    fontSize: 8,
    letterSpacing: 0.4,
  },
  locationValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 3,
  },
  locationPin: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4,
  },
  locationValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  locationChevron: {
    color: colors.purple,
    fontSize: 19,
    lineHeight: 20,
    marginLeft: 5,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 17,
    marginTop: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E8DDF1',
    borderColor: '#FFFFFF',
    borderRadius: 23,
    borderWidth: 2,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: {
    color: colors.purple,
    fontSize: 18,
    fontWeight: '800',
  },
  greeting: {
    flex: 1,
    marginLeft: 10,
  },
  greetingTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  greetingSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  profileAction: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  profileActionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 14,
    shadowColor: '#2A193A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  balanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  addBalanceIcon: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  addBalancePlus: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 32,
    marginTop: -2,
  },
  balanceTextGroup: {
    flex: 1,
  },
  balanceLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  balanceLoader: {
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  balanceSkeleton: {
    height: 19,
    marginTop: 5,
    width: 118,
  },
  balanceError: {
    color: '#A33428',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  balanceVisibility: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  retryText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 9,
  },
  toast: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    gap: 11,
    left: 16,
    minHeight: 58,
    paddingHorizontal: 15,
    paddingVertical: 11,
    position: 'absolute',
    right: 16,
    shadowColor: '#1C1230',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    zIndex: 20,
  },
  toastSuccess: {
    backgroundColor: colors.toastSuccessBackground,
    borderColor: colors.toastSuccessBorder,
  },
  toastError: {
    backgroundColor: colors.toastErrorBackground,
    borderColor: colors.toastErrorBorder,
  },
  toastMessage: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  toastDismiss: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  section: {
    marginTop: 2,
  },
  connectionStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    marginTop: -13,
    paddingLeft: 4,
  },
  connectionStatusText: {
    color: colors.muted,
    fontSize: 11,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionEyebrow: {
    color: '#99979F',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#F1EAF5',
    borderRadius: 13,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  refreshButtonText: {
    color: colors.purple,
    fontSize: 21,
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
  skeletonBlock: {
    backgroundColor: '#EEEAF2',
    borderRadius: 8,
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
  transactionList: {
    gap: 10,
  },
  transactionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  transactionIconSkeleton: {
    borderRadius: 22,
    height: 42,
    width: 42,
  },
  transactionSkeletonDetails: {
    flex: 1,
  },
  transactionTitleSkeleton: {
    height: 13,
    width: '65%',
  },
  transactionDateSkeleton: {
    height: 10,
    marginTop: 7,
    width: '45%',
  },
  transactionBalanceSkeleton: {
    height: 10,
    marginTop: 7,
    width: '55%',
  },
  transactionAmountSkeleton: {
    height: 13,
    width: 54,
  },
  transactionIcon: {
    alignItems: 'center',
    borderRadius: 22,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  transactionCreditIcon: {
    backgroundColor: colors.creditBackground,
  },
  transactionDebitIcon: {
    backgroundColor: colors.debitBackground,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  transactionDate: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  transactionBalance: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  transactionAmountCredit: {
    color: colors.credit,
  },
  transactionAmountDebit: {
    color: colors.debit,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 17,
    borderWidth: 1,
    minHeight: 172,
    paddingHorizontal: 11,
    paddingVertical: 13,
    width: '48%',
    shadowColor: '#241531',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  serviceCardAlternate: {
    backgroundColor: '#FFFFFF',
  },
  serviceIconSkeleton: {
    borderRadius: 34,
    height: 68,
    marginBottom: 10,
    width: 68,
  },
  serviceNameSkeleton: {
    height: 13,
    width: '68%',
  },
  serviceAvailabilitySkeleton: {
    height: 10,
    marginTop: 6,
    width: '78%',
  },
  servicePriceSkeleton: {
    height: 12,
    width: 52,
  },
  serviceArrowSkeleton: {
    height: 16,
    width: 12,
  },
  serviceIcon: {
    alignItems: 'center',
    backgroundColor: '#26343A',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    marginBottom: 10,
    width: 68,
  },
  serviceIconAlternate: {
    backgroundColor: '#114B9A',
  },
  serviceImage: {
    height: 48,
    width: 48,
  },
  serviceName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  serviceAvailability: {
    color: colors.green,
    fontSize: 10,
    marginTop: 3,
  },
  serviceBottomRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderTopColor: '#F1F0F2',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
  },
  servicePrice: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '800',
  },
  serviceArrow: {
    color: colors.purple,
    fontSize: 20,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.78,
  },
  bottomBarWrap: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EEECEF',
    borderTopWidth: 1,
    paddingHorizontal: 21,
    paddingTop: 7,
  },
  bottomBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 49,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  navIcon: {
    color: '#A8A6AE',
    fontSize: 20,
    lineHeight: 23,
  },
  navIconActive: {
    color: colors.purple,
  },
  navLabel: {
    color: '#99979F',
    fontSize: 9,
    marginTop: 1,
  },
  navLabelActive: {
    color: colors.purple,
    fontWeight: '700',
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
    borderRadius: 24,
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
  modalImage: {
    height: 48,
    width: 48,
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
  creditModalIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#F1ECF8',
    borderRadius: 22,
    height: 64,
    justifyContent: 'center',
    marginBottom: 15,
    width: 64,
  },
  creditAmounts: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 21,
  },
  creditAmountOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  creditAmountOptionSelected: {
    backgroundColor: '#F3ECF8',
    borderColor: colors.purple,
  },
  creditAmountText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  creditAmountTextSelected: {
    color: colors.purple,
  },
  creditSimulationNote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 13,
    textAlign: 'center',
  },
});
