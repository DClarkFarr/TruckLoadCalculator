import { debounce } from "lodash-es";
import axios from "axios";
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
    }[];
    ftSq: number;
    message: string;
};

type PalletDataRow = {
    height: number;
    length: number;
    pallet: number;
    weight: number;
    width: number;
};
type PalletDataResponse = {
    rows: PalletDataRow[];
};

const httpClient = axios.create({
    baseURL: `${import.meta.env.VITE_APP_DOMAIN}api/`,
});

const calculateFtSq = (palletData: PalletDataRow[]) => {
    return Math.ceil(
        palletData.reduce((acc, cur) => {
            return acc + cur.height * cur.width * cur.length * cur.pallet;
        }, 0) / 1728
    );
};
function App() {
    const [pallets, setPallets] = useState<PalletRow[]>([]);
    const [loginPrompt, setLoginPrompt] = useState(true);

    const loadedPallets = useMemo(() => {
        return pallets.filter((pallet) => !pallet.loading).length;
    }, [pallets]);

    const totalSqFt = useMemo(() => {
        return pallets.reduce((acc, cur) => {
            return acc + cur.ftSq;
        }, 0);
    }, [pallets]);

    const debouncedSavePallets = useMemo(
        () =>
            debounce(() => {
                localStorage.setItem("pallets", JSON.stringify(pallets));
            }, 500),
        [pallets]
    );

    const setLoginComplete = () => {
        setLoginPrompt(false);
    };

    useEffect(() => {
        debouncedSavePallets();
    }, [pallets]);

    useEffect(() => {
        const pallets = localStorage.getItem("pallets");
        if (pallets) {
            setPallets(JSON.parse(pallets));
        }
    }, []);

    const addPallet = (p: PalletRow) => {
        setPallets([...pallets, p]);
    };

    const removePallet = (index: number) => {
        setPallets((draft) => {
            const newPallets = [...draft];
            newPallets.splice(index, 1);
            return newPallets;
        });
    };

    const updatePallet = (palletId: string, data: Partial<PalletRow>) => {
        setPallets((draft) => {
            const newPallets = [...draft];

            const index = newPallets.findIndex((p) => p.palletId === palletId);

            if (index === -1) {
                return newPallets;
            }

            newPallets[index] = {
                ...newPallets[index],
                ...data,
            };

            return newPallets;
        });
    };

    const fetchPalletData = (palletId: string) => {
        addPallet({
            loading: true,
            palletId,
            ftSq: 0,
            message: "",
        });

        httpClient
            .post<PalletDataResponse>("/pallet", { palletId })
            .then(({ data: { rows } }) => {
                const ftSq = calculateFtSq(rows);
                updatePallet(palletId, {
                    palletData: rows.map(
                        ({ height, length, width, pallet }) => ({
                            height,
                            length,
                            width,
                            count: pallet,
                        })
                    ),
                    ftSq,
                    loading: false,
                });
            })
            .catch((err) => {
                updatePallet(palletId, {
                    loading: false,
                    message: err.data?.message || err.message,
                });
            });
    };

    const [palletFormValue, setPalletFormValue] = useState<string>("");

    const onAddPallet = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const v = parseInt(palletFormValue, 10);
        if (v < 1000) {
            return alert("Pallet ID must be at least 1000");
        }

        const found = pallets.find((p) => p.palletId === palletFormValue);
        if (found) {
            setPalletFormValue("");
            return alert("Pallet ID already in use");
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
                    {pallets.map((p, i) => (
                        <div key={i} className="pallet">
                            <div
                                className="pallet-close"
                                onClick={() => removePallet(i)}
                            >
                                <button>&times;</button>
                            </div>
                            <div className="pallet-id">{p.palletId}</div>
                            {p.loading && (
                                <div className="pallet-loading">Loading...</div>
                            )}
                            {!p.loading && (
                                <>
                                    {p.message ? (
                                        <div className="pallet-message">
                                            {p.message}
                                        </div>
                                    ) : (
                                        <div className="pallet-data">
                                            {p.ftSq}ft<sup>2</sup>
                                        </div>
                                    )}
                                </>
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
                {loadedPallets === 0 && loginPrompt && (
                    <div className="prompt">
                        <h3>Did you login yet?</h3>
                        <p>
                            Log into{" "}
                            <a
                                href="https://www.liquidation.com/login"
                                target="_blank"
                                onClick={setLoginComplete}
                            >
                                Liquidation.com
                            </a>{" "}
                            here.
                        </p>
                        <button
                            className="btn btn-green"
                            onClick={setLoginComplete}
                        >
                            Done
                        </button>
                    </div>
                )}
                {loadedPallets === 0 && !loginPrompt && (
                    <div className="prompt">
                        <h3>Get Started</h3>
                        <p>Add a pallet ID to get started</p>
                    </div>
                )}
                {loadedPallets > 0 && (
                    <>
                        <table
                            className="table"
                            cellPadding={0}
                            cellSpacing={0}
                        >
                            <tbody>
                                {pallets.map((p, i) => {
                                    return (
                                        <>
                                            <tr
                                                className="tr-top"
                                                data-key={`pt-${p.palletId}-${i}`}
                                                key={`pt-${p.palletId}-${i}`}
                                            >
                                                <th>Pallet ID</th>
                                                <th colSpan={3}>
                                                    {p.palletId}
                                                </th>
                                            </tr>
                                            {!p.palletData && (
                                                <tr>
                                                    <td colSpan={4}>
                                                        {p.message}
                                                    </td>
                                                </tr>
                                            )}
                                            {p.palletData &&
                                                p.palletData.map((row, j) => (
                                                    <>
                                                        <tr
                                                            data-key={`phead-${p.palletId}-${i}-${j}`}
                                                            key={`phead-${p.palletId}-${i}-${j}`}
                                                        >
                                                            <th>Height</th>
                                                            <th>Length</th>
                                                            <th>Width</th>
                                                            <th>Count</th>
                                                        </tr>
                                                        <tr
                                                            data-key={`pval-${p.palletId}-${i}-${j}`}
                                                            key={`pval-${p.palletId}-${i}-${j}`}
                                                        >
                                                            <td>
                                                                {row.height}
                                                            </td>
                                                            <td>
                                                                {row.length}
                                                            </td>
                                                            <td>{row.width}</td>
                                                            <td>{row.count}</td>
                                                        </tr>
                                                    </>
                                                ))}
                                            <tr
                                                className="tr-bottom"
                                                data-key={`pb-${p.palletId}-${i}`}
                                                key={`pb-${p.palletId}-${i}`}
                                            >
                                                <td>Total</td>
                                                <th colSpan={3}>
                                                    {p.ftSq}ft<sup>2</sup>
                                                </th>
                                            </tr>
                                            <tr>
                                                <td colSpan={4}>&nbsp;</td>
                                            </tr>
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="totals">
                            <div>Total Quare Feet:</div>
                            <div>
                                {totalSqFt}ft<sup>2</sup>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;
