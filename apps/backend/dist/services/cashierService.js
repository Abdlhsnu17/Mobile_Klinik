"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashierService = void 0;
exports.sumExpenses = sumExpenses;
const collectionService_1 = require("./collectionService");
function dateOf(value) {
    return (value ?? "").slice(0, 10);
}
function paymentDate(payment) {
    return dateOf(payment.paidAt ?? payment.createdAt);
}
class CashierService {
    /** Ringkasan kas untuk satu tanggal: total tunai masuk (pembayaran), tunai keluar
     *  (pengeluaran), dan transaksi non-tunai. */
    static async getDailySummary(date) {
        const target = dateOf(date);
        const [payments, expenses] = await Promise.all([
            collectionService_1.CollectionService.list("payments"),
            collectionService_1.CollectionService.list("expenses"),
        ]);
        // Pencairan dana dari asuransi bukan transaksi loket kasir, jadi tidak
        // dihitung sebagai kas masuk (tunai maupun non-tunai) pada tutup kas.
        const dayPayments = payments.filter((payment) => paymentDate(payment) === target && payment.paymentSource !== "insurance");
        const systemCashTotal = dayPayments
            .filter((payment) => payment.method === "tunai")
            .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
        const nonCashTotal = dayPayments
            .filter((payment) => payment.method !== "tunai")
            .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
        const cashExpenseTotal = expenses
            .filter((expense) => dateOf(expense.date) === target && expense.paymentMethod === "tunai")
            .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
        return {
            date: target,
            systemCashTotal,
            cashExpenseTotal,
            nonCashTotal,
            transactionCount: dayPayments.length,
        };
    }
    /** Menutup kas untuk sebuah tanggal: menghitung kas seharusnya dan selisih terhadap
     *  jumlah fisik yang dihitung kasir, lalu menyimpan rekam penutupan. */
    static async closeShift(input) {
        const summary = await this.getDailySummary(input.closingDate);
        const openingBalance = Number(input.openingBalance ?? 0);
        const countedCashTotal = Number(input.countedCashTotal ?? 0);
        const expectedCashTotal = openingBalance + summary.systemCashTotal - summary.cashExpenseTotal;
        const difference = countedCashTotal - expectedCashTotal;
        return await collectionService_1.CollectionService.createItem("cashierClosings", {
            closingDate: dateOf(input.closingDate),
            cashierName: input.cashierName,
            openingBalance,
            systemCashTotal: summary.systemCashTotal,
            cashExpenseTotal: summary.cashExpenseTotal,
            expectedCashTotal,
            countedCashTotal,
            difference,
            notes: input.notes,
        });
    }
}
exports.CashierService = CashierService;
// Dipakai oleh reportService untuk P&L; diekspor agar mudah diuji terpisah.
function sumExpenses(expenses) {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
}
//# sourceMappingURL=cashierService.js.map