# ValueObject Patterns

## Rules

- Extend `ValueObject<Props>`
- Static `create()` factory with validation — may throw on invalid input (intentional)
- Never mutate `this.props` — return a new instance instead
- Compare with `.equals()` — never `===`

## Example

```ts
import { ValueObject } from 'archstone/core'

interface EmailProps { value: string }

class Email extends ValueObject<EmailProps> {
  get value() { return this.props.value }

  static create(raw: string): Email {
    if (!raw.includes('@')) throw new Error('Invalid email address')
    return new Email({ value: raw.toLowerCase().trim() })
  }

  withDomain(domain: string): Email {
    const [local] = this.props.value.split('@')
    return new Email({ value: `${local}@${domain}` })
  }
}

const a = Email.create('user@example.com')
const b = Email.create('user@example.com')
a.equals(b) // true
```

## Handling throws in use cases

Since `create()` may throw, wrap it inside use cases:

```ts
try {
  const email = Email.create(rawEmail)
  user.updateEmail(email)
} catch {
  return left(new InvalidEmailError())
}
```

## Common Mistakes

```ts
// ❌ comparing with ===
if (user.email === other.email) {} // use .equals()

// ❌ mutating props
this.props.value = newValue // return new Email({ value: newValue })
```
