import { debounce } from "lodash-es";
import { useEffect, useMemo, useState } from "react";
import "./assets/main.scss";

type PalletRow = {
    loading: boolean;
    palletId: string;
    palletData?: {
        height: number;
        width: number;
        length: number;
        count: number;
    };
};

function App() {
    const [pallets, setPallets] = useState<PalletRow[]>([]);

    const debouncedSavePallets = useMemo(
        () =>
            debounce(() => {
                localStorage.setItem("pallets", JSON.stringify(pallets));
            }, 500),
        [pallets]
    );

    useEffect(() => {
        debouncedSavePallets();
    }, [pallets]);

    const addPallet = (p: PalletRow) => {
        setPallets([...pallets, p]);
    };

    const fetchPalletData = (palletId: string) => {
        addPallet({
            loading: true,
            palletId,
        });

        fetch(
            `https://www.liquidation.com/auction/container?id=16590965&_cmd=view&_table=pallet`,
            { mode: "no-cors" }
        ).then((res) => {
            console.log("got res", res);
        });
    };

    const [palletFormValue, setPalletFormValue] = useState<string>("");

    const onAddPallet = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const v = parseInt(palletFormValue, 10);
        if (v < 1000) {
            return alert("Pallet ID must be at least 1000");
        }

        fetchPalletData(palletFormValue);

        setPalletFormValue("");
    };
    const onChangePalletFormValue = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setPalletFormValue(e.target.value.replace(/[^\d]/g, ""));
    };

    return (
        <div className="app">
            <div className="loads">
                <h3>Pallets</h3>

                <div className="pallets">
                    {pallets.map((p) => (
                        <div key={p.palletId} className="pallet">
                            <div className="pallet-id">{p.palletId}</div>
                            {p.loading ? (
                                <div className="pallet-loading">Loading...</div>
                            ) : (
                                <div className="pallet-data">data</div>
                            )}
                        </div>
                    ))}
                </div>

                <form
                    className="pallet-form"
                    action="POST"
                    onSubmit={onAddPallet}
                >
                    <div>
                        <input
                            type="text"
                            className="input"
                            placeholder="Auction Id"
                            value={palletFormValue}
                            onChange={onChangePalletFormValue}
                        />
                    </div>
                    <button className="btn btn-green">Add</button>
                </form>
            </div>
            <div className="results">
                <h3>Pallet Results</h3>
            </div>
        </div>
    );
}

export default App;
