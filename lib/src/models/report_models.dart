import '../core/utils/json_utils.dart';

/// Model untuk pusat peringatan operasional dan laporan keuangan.

enum AlertSeverity {
  critical('critical', 'Kritis'),
  warning('warning', 'Peringatan');

  const AlertSeverity(this.value, this.label);

  final String value;
  final String label;

  static AlertSeverity parse(String? value) =>
      value == 'critical' ? AlertSeverity.critical : AlertSeverity.warning;
}

enum AlertCategory {
  stokMenipis('stok-menipis', 'Stok Menipis'),
  obatKadaluarsa('obat-kadaluarsa', 'Obat Kedaluwarsa'),
  maintenanceAlat('maintenance-alat', 'Maintenance Alat');

  const AlertCategory(this.value, this.label);

  final String value;
  final String label;

  static AlertCategory? tryParse(String? value) {
    for (final category in AlertCategory.values) {
      if (category.value == value) return category;
    }
    return null;
  }
}

class OperationalAlert {
  const OperationalAlert({
    required this.id,
    required this.category,
    required this.severity,
    required this.title,
    required this.detail,
    required this.referenceId,
    required this.referenceType,
    this.dueDate,
    this.daysRemaining,
    this.currentValue,
    this.thresholdValue,
    this.unit,
  });

  final String id;
  final AlertCategory? category;
  final AlertSeverity severity;
  final String title;
  final String detail;
  final String referenceId;
  final String referenceType;
  final String? dueDate;
  final int? daysRemaining;
  final num? currentValue;
  final num? thresholdValue;
  final String? unit;

  factory OperationalAlert.fromJson(Map<String, dynamic> json) =>
      OperationalAlert(
        id: asString(json['id']),
        category: AlertCategory.tryParse(asStringOrNull(json['category'])),
        severity: AlertSeverity.parse(asStringOrNull(json['severity'])),
        title: asString(json['title']),
        detail: asString(json['detail']),
        referenceId: asString(json['referenceId']),
        referenceType: asString(json['referenceType']),
        dueDate: asStringOrNull(json['dueDate']),
        daysRemaining: asIntOrNull(json['daysRemaining']),
        currentValue: asDoubleOrNull(json['currentValue']),
        thresholdValue: asDoubleOrNull(json['thresholdValue']),
        unit: asStringOrNull(json['unit']),
      );
}

class AlertSummary {
  const AlertSummary({
    required this.total,
    required this.critical,
    required this.warning,
    this.byCategory = const {},
  });

  final int total;
  final int critical;
  final int warning;
  final Map<String, int> byCategory;

  factory AlertSummary.fromJson(Map<String, dynamic> json) => AlertSummary(
        total: asInt(json['total']),
        critical: asInt(json['critical']),
        warning: asInt(json['warning']),
        byCategory: asMap(json['byCategory'])
            .map((key, value) => MapEntry(key, asInt(value))),
      );

  static const empty = AlertSummary(total: 0, critical: 0, warning: 0);
}

class OperationalAlertsResponse {
  const OperationalAlertsResponse({
    required this.generatedAt,
    required this.summary,
    required this.alerts,
  });

  final String generatedAt;
  final AlertSummary summary;
  final List<OperationalAlert> alerts;

  factory OperationalAlertsResponse.fromJson(Map<String, dynamic> json) =>
      OperationalAlertsResponse(
        generatedAt: asString(json['generatedAt']),
        summary: AlertSummary.fromJson(asMap(json['summary'])),
        alerts: asModelList(json['alerts'], OperationalAlert.fromJson),
      );

  static const empty = OperationalAlertsResponse(
    generatedAt: '',
    summary: AlertSummary.empty,
    alerts: [],
  );
}

class ExpenseByCategory {
  const ExpenseByCategory({required this.category, required this.total});

  final String category;
  final double total;

  factory ExpenseByCategory.fromJson(Map<String, dynamic> json) =>
      ExpenseByCategory(
        category: asString(json['category']),
        total: asDouble(json['total']),
      );
}

class ProfitLossReport {
  const ProfitLossReport({
    required this.totalRevenue,
    required this.totalExpenses,
    required this.netProfit,
    this.from,
    this.to,
    this.expensesByCategory = const [],
  });

  final double totalRevenue;
  final double totalExpenses;
  final double netProfit;
  final String? from;
  final String? to;
  final List<ExpenseByCategory> expensesByCategory;

  factory ProfitLossReport.fromJson(Map<String, dynamic> json) =>
      ProfitLossReport(
        totalRevenue: asDouble(json['totalRevenue']),
        totalExpenses: asDouble(json['totalExpenses']),
        netProfit: asDouble(json['netProfit']),
        from: asStringOrNull(json['from']),
        to: asStringOrNull(json['to']),
        expensesByCategory:
            asModelList(json['expensesByCategory'], ExpenseByCategory.fromJson),
      );

  static const empty =
      ProfitLossReport(totalRevenue: 0, totalExpenses: 0, netProfit: 0);
}

class CashierDailySummary {
  const CashierDailySummary({
    required this.date,
    required this.systemCashTotal,
    required this.cashExpenseTotal,
    required this.nonCashTotal,
    required this.transactionCount,
  });

  final String date;
  final double systemCashTotal;
  final double cashExpenseTotal;
  final double nonCashTotal;
  final int transactionCount;

  /// Kas yang seharusnya ada di laci: penerimaan tunai dikurangi pengeluaran.
  double get expectedCashTotal => systemCashTotal - cashExpenseTotal;

  factory CashierDailySummary.fromJson(Map<String, dynamic> json) =>
      CashierDailySummary(
        date: asString(json['date']),
        systemCashTotal: asDouble(json['systemCashTotal']),
        cashExpenseTotal: asDouble(json['cashExpenseTotal']),
        nonCashTotal: asDouble(json['nonCashTotal']),
        transactionCount: asInt(json['transactionCount']),
      );

  static const empty = CashierDailySummary(
    date: '',
    systemCashTotal: 0,
    cashExpenseTotal: 0,
    nonCashTotal: 0,
    transactionCount: 0,
  );
}
