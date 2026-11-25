import { createRef, StrictMode } from "react"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  CustomSelect,
} from "./select"

afterEach(() => {
  cleanup()
})

describe("Select Component", () => {
  it("renders trigger with placeholder when no value is selected", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Choose subject">
          <SelectValue placeholder="— Select Subject —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="math">Mathematics</SelectItem>
          <SelectItem value="cs">Computer Science</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByRole("combobox", { name: "Choose subject" })).toBeInTheDocument()
    expect(screen.getByText("— Select Subject —")).toBeInTheDocument()
  })

  it("opens dropdown and selects an option on click", () => {
    const onValueChange = vi.fn()
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Subject">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="algorithms">Algorithms</SelectItem>
          <SelectItem value="databases">Databases</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole("combobox", { name: "Subject" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    // Open dropdown
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    const option = screen.getByRole("option", { name: "Algorithms" })
    expect(option).toBeInTheDocument()

    // Select option
    fireEvent.click(option)
    expect(onValueChange).toHaveBeenCalledWith("algorithms")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("handles fireEvent.change on combobox trigger for test compatibility", () => {
    const onValueChange = vi.fn()
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Subject">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="algorithms">Algorithms</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole("combobox", { name: "Subject" })
    fireEvent.change(trigger, { target: { value: "algorithms" } })
    expect(onValueChange).toHaveBeenCalledWith("algorithms")
  })

  it("closes dropdown on Escape key", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Subject">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="algorithms">Algorithms</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole("combobox", { name: "Subject" })
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    fireEvent.keyDown(trigger, { key: "Escape" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("forwards refs to SelectTrigger, SelectContent, and SelectItem without forwardRef", () => {
    const triggerRef = createRef<HTMLButtonElement>()
    const contentRef = createRef<HTMLDivElement>()
    const itemRef = createRef<HTMLDivElement>()

    render(
      <Select defaultOpen>
        <SelectTrigger ref={triggerRef} aria-label="Ref select">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent ref={contentRef}>
          <SelectItem ref={itemRef} value="one">One</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(triggerRef.current).toBeInstanceOf(HTMLButtonElement)
    expect(contentRef.current).toBeInstanceOf(HTMLDivElement)
    expect(itemRef.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe("CustomSelect Component", () => {
  const options = [
    { value: "opt1", label: "Option 1" },
    { value: "opt2", label: "Option 2" },
  ]

  it("renders with options and handles selection", () => {
    const onChange = vi.fn()
    render(
      <CustomSelect
        id="test-select"
        value="opt1"
        onChange={onChange}
        options={options}
        placeholder="Choose"
      />
    )

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveAttribute("id", "test-select")
    expect(screen.getByText("Option 1")).toBeInTheDocument()

    fireEvent.click(trigger)
    const opt2 = screen.getByRole("option", { name: "Option 2" })
    fireEvent.click(opt2)

    expect(onChange).toHaveBeenCalledWith("opt2")
  })

  it("handles open, selection, outside click, and Escape under React StrictMode", () => {
    const onChange = vi.fn()
    render(
      <StrictMode>
        <div>
          <button type="button">Outside</button>
          <CustomSelect
            value="opt1"
            onChange={onChange}
            options={options}
            aria-label="Strict subject"
          />
        </div>
      </StrictMode>
    )

    const trigger = screen.getByRole("combobox", { name: "Strict subject" })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    const option2 = screen.getByRole("option", { name: "Option 2" })
    fireEvent.mouseDown(option2)
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    fireEvent.click(option2)
    expect(onChange).toHaveBeenCalledWith("opt2")
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }))
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    fireEvent.keyDown(trigger, { key: "Escape" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })
})

