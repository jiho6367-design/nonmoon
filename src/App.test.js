import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  test("renders the login form", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByText("논문 카드 서비스에 접속하려면 로그인하세요.")).toBeInTheDocument();
    expect(screen.getByLabelText("아이디")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  test("navigates to the signup form", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /아직 회원이 아니신가요\? 회원가입/ })
    );

    expect(screen.getByRole("heading", { name: "회원가입" })).toBeInTheDocument();
    expect(screen.getByText("논문 카드 서비스를 이용하기 위한 계정을 만듭니다.")).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호 확인/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "회원가입" })).toBeInTheDocument();
  });

  test("returns to the login form from signup", () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: /아직 회원이 아니신가요\? 회원가입/ })
    );

    fireEvent.click(
      screen.getByRole("button", { name: /이미 계정이 있으신가요\? 로그인/ })
    );

    expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
    expect(
      screen.getByText("논문 카드 서비스에 접속하려면 로그인하세요.")
    ).toBeInTheDocument();
  });
});
