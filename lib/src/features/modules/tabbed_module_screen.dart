import 'package:flutter/material.dart';

import 'collection_config.dart';
import 'collection_screen.dart';

/// Modul yang mencakup beberapa koleksi terkait dalam satu halaman bertab.
///
/// Contohnya Laboratorium (order + hasil) dan Rawat Inap (admisi + bed +
/// catatan visit), yang di frontend Next.js ditampilkan sebagai beberapa
/// bagian dalam satu halaman panjang.
class TabbedModuleScreen extends StatelessWidget {
  const TabbedModuleScreen({
    super.key,
    required this.configs,
    required this.tabLabels,
  }) : assert(
          configs.length == tabLabels.length,
          'Jumlah tab harus sama dengan jumlah koleksi',
        );

  final List<CollectionConfig> configs;
  final List<String> tabLabels;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: configs.length,
      child: Column(
        children: [
          Material(
            color: Theme.of(context).colorScheme.surface,
            child: TabBar(
              tabs: [for (final label in tabLabels) Tab(text: label)],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                for (final config in configs) CollectionScreen(config: config),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
