import { Entity, EntityProps } from '../../src'

interface SampleProps extends EntityProps {
  label?: string
}

class Sample extends Entity<Sample, SampleProps> {
  get label(): string | undefined {
    return this.props.label
  }
}

test('assigns a generated id when none is provided', () => {
  const sample = new Sample({})
  expect(sample.id.value).toHaveLength(36)
})

test('keeps the given id', () => {
  const first = new Sample({})
  const second = new Sample({ id: first.id.value })
  expect(second.id.value).toBe(first.id.value)
})

test('two entities with the same id are equal, regardless of other props', () => {
  const first = new Sample({ label: 'a' })
  const second = new Sample({ id: first.id.value, label: 'b' })
  expect(first.equals(second)).toBe(true)
  expect(first.notEquals(second)).toBe(false)
})

test('two entities with different ids are not equal', () => {
  expect(new Sample({}).equals(new Sample({}))).toBe(false)
})

test('clone rebuilds the concrete subclass with overridden props, keeping the id', () => {
  const original = new Sample({ label: 'old' })
  const cloned = original.clone({ label: 'new' })
  expect(cloned).toBeInstanceOf(Sample)
  expect(cloned.label).toBe('new')
  expect(cloned.id.value).toBe(original.id.value)
})
