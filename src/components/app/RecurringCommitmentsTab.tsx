import { useState, useMemo, useCallback } from 'react';
import { CreditCard, RefreshCw, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InstallmentTimelineCard } from './InstallmentTimelineCard';
import { InstallmentDetailsModal } from './InstallmentDetailsModal';
import { RecurringTimelineCard } from './RecurringTimelineCard';
import { RecurringDetailsModal } from './RecurringDetailsModal';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import { FinancialCommitment } from '@/types/financialCommitment';
import { toast } from 'sonner';

interface RecurringCommitmentsTabProps {
  commitments: FinancialCommitment[];
  onMarkComplete: (id: string) => void;
  onEdit: (commitment: FinancialCommitment) => void;
  onDelete: (id: string) => void;
  onRegisterPayment?: (commitmentId: string, paymentData: { paidAt: Date; amount: number }) => Promise<boolean>;
}

export function RecurringCommitmentsTab({
  commitments,
  onMarkComplete,
  onEdit,
  onDelete,
  onRegisterPayment,
}: RecurringCommitmentsTabProps) {
  const [subTab, setSubTab] = useState<'installment' | 'recurring'>('installment');
  const [installmentDetailsModal, setInstallmentDetailsModal] = useState<FinancialCommitment | null>(null);
  const [recurringDetailsModal, setRecurringDetailsModal] = useState<FinancialCommitment | null>(null);
  const [paymentModal, setPaymentModal] = useState<FinancialCommitment | null>(null);

  // Filter by type
  const installmentCommitments = useMemo(() => 
    commitments.filter(c => c.type === 'installment'),
    [commitments]
  );

  const recurringCommitments = useMemo(() => 
    commitments.filter(c => c.type === 'recurring'),
    [commitments]
  );

  // Group by status
  const groupByStatus = (items: FinancialCommitment[]) => {
    const inProgress = items.filter(c => c.status !== 'completed');
    const completed = items.filter(c => c.status === 'completed');
    return { inProgress, completed };
  };

  const installmentGroups = groupByStatus(installmentCommitments);
  const recurringGroups = groupByStatus(recurringCommitments);

  const handleViewInstallmentDetails = (commitment: FinancialCommitment) => {
    setInstallmentDetailsModal(commitment);
  };

  const handleViewRecurringDetails = (commitment: FinancialCommitment) => {
    setRecurringDetailsModal(commitment);
  };

  const handleOpenPaymentModal = (commitment: FinancialCommitment) => {
    setPaymentModal(commitment);
  };

  const handleConfirmPayment = useCallback(async (commitmentId: string, paymentData: { paidAt: Date; amount: number }) => {
    if (!onRegisterPayment) {
      // Fallback to simple mark complete
      onMarkComplete(commitmentId);
      toast.success('Pagamento registrado!');
      return;
    }

    const success = await onRegisterPayment(commitmentId, paymentData);
    if (success) {
      toast.success('Pagamento registrado com sucesso!');
      setInstallmentDetailsModal(null);
      setRecurringDetailsModal(null);
    } else {
      toast.error('Erro ao registrar pagamento');
    }
  }, [onRegisterPayment, onMarkComplete]);

  const handleMarkInstallmentPaid = (id: string) => {
    const commitment = installmentCommitments.find(c => c.id === id);
    if (commitment) {
      handleOpenPaymentModal(commitment);
    }
  };

  const handleMarkRecurringPaid = (id: string) => {
    const commitment = recurringCommitments.find(c => c.id === id);
    if (commitment) {
      handleOpenPaymentModal(commitment);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs for type selection */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'installment' | 'recurring')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Parcelados ({installmentCommitments.length})
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recorrentes ({recurringCommitments.length})
          </TabsTrigger>
        </TabsList>

        {/* Installment Tab Content */}
        <TabsContent value="installment" className="mt-6 space-y-6">
          {installmentCommitments.length === 0 ? (
            <div className="glass-card p-8 rounded-xl text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum parcelamento
              </h3>
              <p className="text-muted-foreground">
                Você não possui compromissos parcelados cadastrados.
              </p>
            </div>
          ) : (
            <>
              {/* In Progress */}
              {installmentGroups.inProgress.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Em andamento ({installmentGroups.inProgress.length})
                  </h3>
                  <div className="grid gap-4">
                    {installmentGroups.inProgress.map(commitment => (
                      <InstallmentTimelineCard
                        key={commitment.id}
                        commitment={commitment}
                        onViewDetails={handleViewInstallmentDetails}
                        onMarkPaid={handleMarkInstallmentPaid}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {installmentGroups.completed.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    ✓ Concluídos ({installmentGroups.completed.length})
                  </h3>
                  <div className="grid gap-4">
                    {installmentGroups.completed.map(commitment => (
                      <InstallmentTimelineCard
                        key={commitment.id}
                        commitment={commitment}
                        onViewDetails={handleViewInstallmentDetails}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Recurring Tab Content */}
        <TabsContent value="recurring" className="mt-6 space-y-6">
          {recurringCommitments.length === 0 ? (
            <div className="glass-card p-8 rounded-xl text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum recorrente
              </h3>
              <p className="text-muted-foreground">
                Você não possui compromissos recorrentes cadastrados.
              </p>
            </div>
          ) : (
            <>
              {/* In Progress */}
              {recurringGroups.inProgress.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Ativos ({recurringGroups.inProgress.length})
                  </h3>
                  <div className="grid gap-4">
                    {recurringGroups.inProgress.map(commitment => (
                      <RecurringTimelineCard
                        key={commitment.id}
                        commitment={commitment}
                        onViewDetails={handleViewRecurringDetails}
                        onMarkPaid={handleMarkRecurringPaid}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {recurringGroups.completed.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    ✓ Finalizados ({recurringGroups.completed.length})
                  </h3>
                  <div className="grid gap-4">
                    {recurringGroups.completed.map(commitment => (
                      <RecurringTimelineCard
                        key={commitment.id}
                        commitment={commitment}
                        onViewDetails={handleViewRecurringDetails}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Installment Details Modal */}
      <InstallmentDetailsModal
        open={!!installmentDetailsModal}
        onOpenChange={(open) => !open && setInstallmentDetailsModal(null)}
        commitment={installmentDetailsModal}
        onMarkPaid={handleMarkInstallmentPaid}
      />

      {/* Recurring Details Modal */}
      <RecurringDetailsModal
        open={!!recurringDetailsModal}
        onOpenChange={(open) => !open && setRecurringDetailsModal(null)}
        commitment={recurringDetailsModal}
        onMarkPaid={handleMarkRecurringPaid}
      />

      {/* Register Payment Modal */}
      <RegisterPaymentModal
        open={!!paymentModal}
        onOpenChange={(open) => !open && setPaymentModal(null)}
        commitment={paymentModal}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
