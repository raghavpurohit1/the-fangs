import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class FieldSpec {
  final String keyName, label;
  final bool required, secret, toggle, number, dateTime, dateOnly;
  final int lines;
  final int? maxLength;
  final num? minimum, maximum;
  final bool integer;
  final Map<String, String>? options;
  final String? help;
  const FieldSpec(
    this.keyName,
    this.label, {
    this.required = false,
    this.secret = false,
    this.toggle = false,
    this.number = false,
    this.dateTime = false,
    this.dateOnly = false,
    this.lines = 1,
    this.options,
    this.help,
    this.maxLength,
    this.minimum,
    this.maximum,
    this.integer = false,
  });
}

class RecordFormPage extends StatefulWidget {
  final String title, submitLabel;
  final String? description;
  final List<FieldSpec> fields;
  final Map<String, dynamic> initial;
  final Future<void> Function(Map<String, dynamic>) onSave;
  const RecordFormPage({
    super.key,
    required this.title,
    required this.fields,
    required this.onSave,
    this.initial = const {},
    this.submitLabel = 'Save',
    this.description,
  });
  @override
  State<RecordFormPage> createState() => _RecordFormPageState();
}

class _RecordFormPageState extends State<RecordFormPage> {
  final _form = GlobalKey<FormState>();
  final Map<String, TextEditingController> _text = {};
  late Map<String, dynamic> _values;
  bool _saving = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _values = Map.of(widget.initial);
    for (final f in widget.fields) {
      if (f.toggle) _values[f.keyName] = _values[f.keyName] == true;
      if (!f.toggle && f.options == null) {
        _text[f.keyName] = TextEditingController(
          text: f.secret ? '' : '${_values[f.keyName] ?? ''}',
        );
      }
    }
  }

  @override
  void dispose() {
    for (final c in _text.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      for (final f in widget.fields) {
        if (_text.containsKey(f.keyName)) {
          final raw = _text[f.keyName]!.text;
          _values[f.keyName] = f.number
              ? (raw.trim().isEmpty ? null : num.parse(raw.trim()))
              : (f.secret ? raw : raw.trim());
        }
      }
      await widget.onSave(Map.of(_values));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickDate(FieldSpec field) async {
    final parsed = DateTime.tryParse(_text[field.keyName]!.text);
    final candidate = field.dateOnly
        ? parsed ?? DateTime.now()
        : parsed?.toLocal() ?? DateTime.now();
    final initial =
        candidate.isBefore(DateTime(2000)) || candidate.isAfter(DateTime(2100))
        ? DateTime.now()
        : candidate;
    final day = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (day == null || !mounted) return;
    if (field.dateOnly) {
      _text[field.keyName]!.text = day.toIso8601String().split('T').first;
    } else {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(initial),
      );
      if (time == null || !mounted) return;
      _text[field.keyName]!.text = DateTime(
        day.year,
        day.month,
        day.day,
        time.hour,
        time.minute,
      ).toUtc().toIso8601String();
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.title)),
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 700),
          child: Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (widget.description != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: Text(widget.description!),
                  ),
                for (final f in widget.fields)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: f.toggle
                        ? SwitchListTile.adaptive(
                            contentPadding: EdgeInsets.zero,
                            title: Text(f.label),
                            value: _values[f.keyName] == true,
                            onChanged: _saving
                                ? null
                                : (v) => setState(() => _values[f.keyName] = v),
                          )
                        : f.options != null
                        ? DropdownButtonFormField<String>(
                            initialValue:
                                f.options!.containsKey(_values[f.keyName])
                                ? _values[f.keyName] as String
                                : null,
                            isExpanded: true,
                            decoration: InputDecoration(
                              labelText: f.label,
                              helperText: f.help,
                              helperMaxLines: 3,
                            ),
                            items: f.options!.entries
                                .map(
                                  (e) => DropdownMenuItem(
                                    value: e.key,
                                    child: Text(
                                      e.value,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: _saving
                                ? null
                                : (v) => _values[f.keyName] = v,
                            validator: (v) => f.required && v == null
                                ? 'Choose ${f.label.toLowerCase()}.'
                                : null,
                          )
                        : TextFormField(
                            controller: _text[f.keyName],
                            obscureText: f.secret,
                            enabled: !_saving,
                            key: ValueKey('field-${f.keyName}'),
                            readOnly: f.dateTime || f.dateOnly,
                            onTap: f.dateTime || f.dateOnly
                                ? () => _pickDate(f)
                                : null,
                            maxLines: f.secret ? 1 : f.lines,
                            maxLength: f.maxLength,
                            keyboardType: f.number
                                ? TextInputType.numberWithOptions(
                                    decimal: !f.integer,
                                    signed: f.minimum == null || f.minimum! < 0,
                                  )
                                : TextInputType.text,
                            autocorrect: !f.secret,
                            enableSuggestions: !f.secret,
                            decoration: InputDecoration(
                              labelText: f.label,
                              helperText: f.help,
                              helperMaxLines: 4,
                              alignLabelWithHint: f.lines > 1,
                              suffixIcon:
                                  (f.dateTime || f.dateOnly) &&
                                      !f.required &&
                                      _text[f.keyName]!.text.isNotEmpty
                                  ? IconButton(
                                      tooltip: 'Clear ${f.label.toLowerCase()}',
                                      onPressed: _saving
                                          ? null
                                          : () => setState(
                                              () => _text[f.keyName]!.clear(),
                                            ),
                                      icon: const Icon(Icons.clear),
                                    )
                                  : null,
                            ),
                            validator: (v) {
                              if (f.required && (v ?? '').trim().isEmpty) {
                                return '${f.label} is required.';
                              }
                              if (f.number && (v ?? '').trim().isNotEmpty) {
                                final value = num.tryParse(v!.trim());
                                if (value == null || !value.isFinite) {
                                  return 'Enter a valid number.';
                                }
                                if (f.integer &&
                                    value != value.roundToDouble()) {
                                  return 'Enter a whole number.';
                                }
                                if (f.minimum != null && value < f.minimum!) {
                                  return 'Enter ${f.minimum} or more.';
                                }
                                if (f.maximum != null && value > f.maximum!) {
                                  return 'Enter ${f.maximum} or less.';
                                }
                              }
                              return null;
                            },
                          ),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving…' : widget.submitLabel),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

void showMessage(BuildContext context, Object message) =>
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message.toString())));

Future<void> openWebLink(BuildContext context, String value) async {
  final uri = Uri.tryParse(value);
  if (uri == null ||
      uri.scheme != 'https' ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty) {
    showMessage(context, 'A valid secure link is required.');
    return;
  }
  try {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
        context.mounted) {
      showMessage(context, 'Unable to open this link.');
    }
  } catch (_) {
    if (context.mounted) showMessage(context, 'Unable to open this link.');
  }
}

class EmptyPanel extends StatelessWidget {
  final String title, message;
  const EmptyPanel(this.title, this.message, {super.key});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(message),
        ],
      ),
    ),
  );
}
