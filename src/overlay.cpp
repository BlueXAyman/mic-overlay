#include <napi.h>
#include <windows.h>
#include <d3d11.h>
#include <dxgi.h>
#include <dwmapi.h>

class GameOverlay : public Napi::ObjectWrap<GameOverlay> {
private:
    static HWND overlayWindow;
    static ID3D11Device* d3dDevice;
    static ID3D11DeviceContext* d3dContext;
    static IDXGISwapChain* swapChain;
    
    static LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
        switch (uMsg) {
            case WM_DESTROY:
                PostQuitMessage(0);
                return 0;
        }
        return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }

    static void CreateOverlayWindow() {
        WNDCLASSEX wc = {};
        wc.cbSize = sizeof(WNDCLASSEX);
        wc.lpfnWndProc = WindowProc;
        wc.hInstance = GetModuleHandle(NULL);
        wc.lpszClassName = L"MicOverlayClass";
        RegisterClassEx(&wc);

        // Create transparent, layered window
        overlayWindow = CreateWindowEx(
            WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST,
            L"MicOverlayClass",
            L"Mic Overlay",
            WS_POPUP,
            0, 0, GetSystemMetrics(SM_CXSCREEN), GetSystemMetrics(SM_CYSCREEN),
            NULL,
            NULL,
            GetModuleHandle(NULL),
            NULL
        );

        // Make the window transparent
        SetLayeredWindowAttributes(overlayWindow, RGB(0,0,0), 0, LWA_COLORKEY);
        
        // Enable transparency composition
        BOOL enabled = TRUE;
        DwmEnableComposition(DWM_EC_ENABLECOMPOSITION);
        
        // Show the window
        ShowWindow(overlayWindow, SW_SHOW);
        UpdateWindow(overlayWindow);
    }

    static void InitD3D() {
        DXGI_SWAP_CHAIN_DESC scd = {};
        scd.BufferCount = 2;
        scd.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
        scd.BufferDesc.Width = GetSystemMetrics(SM_CXSCREEN);
        scd.BufferDesc.Height = GetSystemMetrics(SM_CYSCREEN);
        scd.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
        scd.OutputWindow = overlayWindow;
        scd.SampleDesc.Count = 1;
        scd.Windowed = TRUE;
        scd.SwapEffect = DXGI_SWAP_EFFECT_DISCARD;

        D3D_FEATURE_LEVEL featureLevel;
        D3D11CreateDeviceAndSwapChain(
            NULL,
            D3D_DRIVER_TYPE_HARDWARE,
            NULL,
            D3D11_CREATE_DEVICE_BGRA_SUPPORT,
            NULL,
            0,
            D3D11_SDK_VERSION,
            &scd,
            &swapChain,
            &d3dDevice,
            &featureLevel,
            &d3dContext
        );
    }

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "GameOverlay", {
            InstanceMethod("installHooks", &GameOverlay::InstallHooks),
            InstanceMethod("showOverlay", &GameOverlay::ShowOverlay),
            InstanceMethod("hideOverlay", &GameOverlay::HideOverlay)
        });

        exports.Set("GameOverlay", func);
        return exports;
    }

    static void InstallHooks(const Napi::CallbackInfo& info) {
        CreateOverlayWindow();
        InitD3D();
    }

    static void ShowOverlay(const Napi::CallbackInfo& info) {
        if (overlayWindow) {
            ShowWindow(overlayWindow, SW_SHOW);
            SetForegroundWindow(overlayWindow);
        }
    }

    static void HideOverlay(const Napi::CallbackInfo& info) {
        if (overlayWindow) {
            ShowWindow(overlayWindow, SW_HIDE);
        }
    }
};

HWND GameOverlay::overlayWindow = NULL;
ID3D11Device* GameOverlay::d3dDevice = NULL;
ID3D11DeviceContext* GameOverlay::d3dContext = NULL;
IDXGISwapChain* GameOverlay::swapChain = NULL;

NODE_API_MODULE(overlay, GameOverlay::Init) 