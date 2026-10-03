function textValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function isTallyPayload(body) {
  return Boolean(
    body &&
      body.eventType === 'FORM_RESPONSE' &&
      body.data &&
      Array.isArray(body.data.fields)
  );
}

function labelOf(field) {
  return typeof field.label === 'string' ? field.label.trim().toLowerCase() : '';
}

function findField(fields, matches) {
  return fields.find((field) => matches(field)) || null;
}

function mapTallyPayload(body) {
  const fields = body.data.fields;
  const nameField = findField(fields, (field) => {
    const label = labelOf(field);
    return label === 'name' || label === 'full name' || label === 'your name';
  });
  const emailField =
    findField(fields, (field) => field.type === 'INPUT_EMAIL') ||
    findField(fields, (field) => labelOf(field).includes('email'));
  const phoneField =
    findField(fields, (field) => field.type === 'INPUT_PHONE_NUMBER') ||
    findField(fields, (field) => labelOf(field).includes('phone'));

  const responseId = textValue(body.data.responseId || body.data.submissionId);

  return {
    name: textValue(nameField && nameField.value),
    email: textValue(emailField && emailField.value),
    phone: textValue(phoneField && phoneField.value),
    source: 'tally',
    externalId: responseId ? `tally:${responseId}` : '',
  };
}

module.exports = {
  isTallyPayload,
  mapTallyPayload,
};
