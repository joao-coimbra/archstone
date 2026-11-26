# ValueObject Patterns

## Rules

- Extend `ValueObject<Props>`
- Static `create()` factory with validation
- Prefer returning `Either<Error, ValueObject>` when callers must handle failure explicitly
- If `create()` throws, wrap with `attempt()` (or `try/catch`) inside use cases and return `left()`
- Never mutate `this.props` — return a new instance instead
- Compare with `.equals()` — never `===`

## Example

```ts
import { ValueObject } from "archstone/core"

interface EmailProps {
  value: string
}

class Email extends ValueObject<EmailProps> {
  get value() {
    return this.props.value
  }

  static create(raw: string): Email {
    if (!raw.includes("@")) throw new Error("Invalid email address")
    return new Email({ value: raw.toLowerCase().trim() })
  }

  withDomain(domain: string): Email {
    const [local] = this.props.value.split("@")
    return new Email({ value: `${local}@${domain}` })
  }
}

const a = Email.create("user@example.com")
const b = Email.create("user@example.com")
a.equals(b) // true
```

## Handling validation in use cases

```ts
import { attempt, left } from "archstone/core"

const emailResult = attempt(() => Email.create(rawEmail))
if (emailResult.isLeft()) return left(new InvalidEmailError())
user.updateEmail(emailResult.value)
```

## Common Mistakes

```ts
// ❌ comparing with ===
if (user.email === other.email) {
} // use .equals()

// ❌ mutating props
this.props.value = newValue // return new Email({ value: newValue })
```
