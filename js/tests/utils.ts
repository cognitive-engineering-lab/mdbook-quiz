import { screen } from "@testing-library/react";

export let startButton = () => screen.getByRole("button", { name: "Start" });
export let submitButton = () => screen.getByRole("button", { name: "Submit" });
export let bugButton = () => screen.getByRole("button", { name: "🐞" });
