import { useMemo, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { SummaryCards } from './components/SummaryCards';
import { ExpenseChart } from './components/ExpenseChart';
import { TransactionFiltersBar } from './components/TransactionFiltersBar';
import { TransactionTable } from './components/TransactionTable';
import { TransactionModal } from './components/TransactionModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useAuth } from './hooks/useAuth';
import {
  useTransactions,
  type SaveTransactionPayload,
} from './hooks/useTransactions';
import type {
  ActiveView,
  Transaction,
  TransactionCategory,
  TransactionFilters,
} from './types/transaction';
import {
  calculateCategoryBreakdown,
  calculateSummary,
  filterTransactions,
} from './utils/finance';

const INITIAL_FILTERS: TransactionFilters = {
  search: '',
  type: 'all',
  category: 'All',
};

export default function App() {
  const {
    user,
    loading: authLoading,
    error: authError,
    isFirebaseConfigured,
    clearError,
    signIn,
    signUp,
    loginAsDemo,
    signOut,
  } = useAuth();

  const {
    transactions,
    loading: txLoading,
    error: txError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loadSampleData,
  } = useTransactions(user);

  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(INITIAL_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);
  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(transactions),
    [transactions],
  );
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters],
  );

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalOpen(true);
  };

  const handleSaveTransaction = async (
    payload: SaveTransactionPayload,
    editingId?: string,
  ) => {
    if (editingId) {
      await updateTransaction(editingId, payload);
    } else {
      await addTransaction(payload);
    }
  };

  const handleSelectChartCategory = (category: 'All' | TransactionCategory) => {
    setFilters((prev) => ({
      ...prev,
      category,
      type: category === 'All' ? prev.type : 'expense',
    }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-medium text-slate-500">
          Loading LedgerFlow...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          isFirebaseConfigured={isFirebaseConfigured}
          error={authError}
          onClearError={clearError}
          onSignIn={signIn}
          onSignUp={signUp}
          onDemoLogin={loginAsDemo}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        user={user}
        onSignOut={signOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeView={activeView}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onAddTransaction={handleOpenCreate}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
          {txError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700"
            >
              {txError}
            </div>
          )}

          {/* Top Summary Cards */}
          <SummaryCards summary={summary} />

          {/* Overview View: 12-col Grid (Transactions + Category Breakdown Chart) */}
          {activeView === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <section
                aria-label="Recent transactions"
                className="xl:col-span-8 bg-white border border-slate-200/90 rounded-xl p-6 space-y-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Recent Transactions
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search, filter, edit, or delete entries in real time
                    </p>
                  </div>
                </div>

                <TransactionFiltersBar
                  filters={filters}
                  totalCount={transactions.length}
                  filteredCount={filteredTransactions.length}
                  onChangeFilters={setFilters}
                  onResetFilters={handleResetFilters}
                />

                <TransactionTable
                  transactions={filteredTransactions}
                  totalUnfilteredCount={transactions.length}
                  loading={txLoading}
                  onEdit={handleOpenEdit}
                  onDelete={setDeletingTransaction}
                  onAddNew={handleOpenCreate}
                  onResetFilters={handleResetFilters}
                  onLoadSampleData={loadSampleData}
                  canLoadSampleData={user.isDemo}
                />
              </section>

              <div className="xl:col-span-4">
                <ExpenseChart
                  breakdown={categoryBreakdown}
                  totalExpenses={summary.totalExpenses}
                  selectedCategory={filters.category}
                  onSelectCategory={handleSelectChartCategory}
                />
              </div>
            </div>
          )}

          {/* Dedicated Transactions Ledger View */}
          {activeView === 'transactions' && (
            <section
              aria-label="All transactions"
              className="bg-white border border-slate-200/90 rounded-xl p-6 space-y-5"
            >
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  All Transactions
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full ledger ordered by most recent date
                </p>
              </div>

              <TransactionFiltersBar
                filters={filters}
                totalCount={transactions.length}
                filteredCount={filteredTransactions.length}
                onChangeFilters={setFilters}
                onResetFilters={handleResetFilters}
              />

              <TransactionTable
                transactions={filteredTransactions}
                totalUnfilteredCount={transactions.length}
                loading={txLoading}
                onEdit={handleOpenEdit}
                onDelete={setDeletingTransaction}
                onAddNew={handleOpenCreate}
                onResetFilters={handleResetFilters}
                onLoadSampleData={loadSampleData}
                canLoadSampleData={user.isDemo}
              />
            </section>
          )}

          {/* Dedicated Analytics View */}
          {activeView === 'analytics' && (
            <ExpenseChart
              breakdown={categoryBreakdown}
              totalExpenses={summary.totalExpenses}
              selectedCategory={filters.category}
              onSelectCategory={(cat) => {
                handleSelectChartCategory(cat);
                if (cat !== 'All') {
                  setActiveView('transactions');
                }
              }}
              expanded
            />
          )}
        </main>
      </div>

      {/* Add / Edit Modal */}
      <TransactionModal
        open={modalOpen}
        editingTransaction={editingTransaction}
        onClose={() => {
          setModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        transaction={deletingTransaction}
        onCancel={() => setDeletingTransaction(null)}
        onConfirm={deleteTransaction}
      />

      <OfflineIndicator />
    </div>
  );
}
