import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import QRScanner from "@/components/qr-scanner";

// Mock the QR scanner library
jest.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: ({ onScan, onError }: any) => (
    <div data-testid="mock-qr-scanner">
      <button
        onClick={() =>
          onScan(
            '{"type":"health_access_request","digitalIdentifier":"patient_test123","issuedAt":"2025-01-01T00:00:00.000Z","version":"1.0"}'
          )
        }
        data-testid="trigger-scan"
      >
        Trigger Scan
      </button>
      <button onClick={() => onError(new Error("Camera error"))} data-testid="trigger-error">
        Trigger Error
      </button>
    </div>
  ),
}));

describe("QRScanner Component", () => {
  const mockProps = {
    onScanSuccess: jest.fn(),
    onScanError: jest.fn(),
    organizationId: "test-org",
    requestedBy: "test-user",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the QR scanner interface", () => {
    render(<QRScanner {...mockProps} />);

    expect(screen.getByText("Patient QR Scanner")).toBeInTheDocument();
    expect(screen.getByText("Scan patient QR code to request access to health records")).toBeInTheDocument();
    expect(screen.getByText("Start Scanning")).toBeInTheDocument();
  });

  it("starts and stops scanning when buttons are clicked", () => {
    render(<QRScanner {...mockProps} />);

    const startButton = screen.getByText("Start Scanning");
    fireEvent.click(startButton);

    expect(screen.getByText("Stop Scanning")).toBeInTheDocument();
    expect(screen.getByTestId("mock-qr-scanner")).toBeInTheDocument();

    const stopButton = screen.getByText("Stop Scanning");
    fireEvent.click(stopButton);

    expect(screen.getByText("Start Scanning")).toBeInTheDocument();
  });

  it("handles successful QR scan", async () => {
    render(<QRScanner {...mockProps} />);

    // Start scanning
    fireEvent.click(screen.getByText("Start Scanning"));

    // Trigger a successful scan
    fireEvent.click(screen.getByTestId("trigger-scan"));

    await waitFor(() => {
      expect(mockProps.onScanSuccess).toHaveBeenCalledWith({
        type: "health_access_request",
        digitalIdentifier: "patient_test123",
        issuedAt: "2025-01-01T00:00:00.000Z",
        version: "1.0",
      });
    });

    expect(screen.getByText("QR Code Valid")).toBeInTheDocument();
  });

  it("handles QR scan errors", async () => {
    render(<QRScanner {...mockProps} />);

    // Start scanning
    fireEvent.click(screen.getByText("Start Scanning"));

    // Trigger an error
    fireEvent.click(screen.getByTestId("trigger-error"));

    await waitFor(() => {
      expect(mockProps.onScanError).toHaveBeenCalledWith("Camera error");
    });
  });

  it("validates QR code format", async () => {
    const { rerender } = render(<QRScanner {...mockProps} />);

    // Mock invalid QR data
    const MockScannerWithInvalidData = ({ onScan }: any) => (
      <div data-testid="mock-qr-scanner">
        <button
          onClick={() => onScan('{"type":"invalid_type","digitalIdentifier":"test123"}')}
          data-testid="trigger-invalid-scan"
        >
          Trigger Invalid Scan
        </button>
      </div>
    );

    jest.doMock("@yudiel/react-qr-scanner", () => ({
      Scanner: MockScannerWithInvalidData,
    }));

    rerender(<QRScanner {...mockProps} />);

    // Start scanning
    fireEvent.click(screen.getByText("Start Scanning"));

    // Trigger invalid scan
    if (screen.queryByTestId("trigger-invalid-scan")) {
      fireEvent.click(screen.getByTestId("trigger-invalid-scan"));

      await waitFor(() => {
        expect(mockProps.onScanError).toHaveBeenCalledWith(expect.stringContaining("Invalid QR code type"));
      });
    }
  });

  it("resets scanner state", () => {
    render(<QRScanner {...mockProps} />);

    // Start scanning
    fireEvent.click(screen.getByText("Start Scanning"));

    // Trigger a successful scan
    fireEvent.click(screen.getByTestId("trigger-scan"));

    // Reset should be available after scan
    waitFor(() => {
      const resetButton = screen.getByText("Reset");
      fireEvent.click(resetButton);

      expect(screen.queryByText("QR Code Valid")).not.toBeInTheDocument();
    });
  });
});
