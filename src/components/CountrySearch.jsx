import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaGlobe, FaTimes, FaSpinner } from 'react-icons/fa';
import '../styles/Countrysearch.css';

const CountrySearch = ({ onSelectCountry, placeholder = "Buscar país..." }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const searchRef = useRef(null);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Buscar países cuando el usuario escribe (con debounce)
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2) {
            setCountries([]);
            setShowDropdown(false);
            return;
        }

        const delaySearch = setTimeout(async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`https://restcountries.com/v3.1/name/${searchTerm}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        setCountries([]);
                        setError('No se encontraron países');
                    } else {
                        throw new Error('Error al buscar países');
                    }
                    return;
                }

                const data = await response.json();

                // Filtrar y mapear países con información útil
                const mappedCountries = data.map(country => ({
                    name: country.name.common,
                    officialName: country.name.official,
                    cioc: country.cioc || null,
                    cca2: country.cca2,
                    cca3: country.cca3,
                    flag: country.flags.svg || country.flags.png,
                    region: country.region,
                    capital: country.capital?.[0] || 'N/A'
                }));

                setCountries(mappedCountries);
                setShowDropdown(true);
            } catch (err) {
                setError(err.message);
                setCountries([]);
            } finally {
                setLoading(false);
            }
        }, 300); // Debounce de 300ms

        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleSelectCountry = (country) => {
        setSelectedCountry(country);
        setSearchTerm(country.name);
        setShowDropdown(false);

        // Callback con la información del país
        if (onSelectCountry) {
            onSelectCountry({
                name: country.name,
                cioc: country.cioc,
                cca2: country.cca2,
                cca3: country.cca3,
                flag: country.flag,
                region: country.region,
                capital: country.capital
            });
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        setSelectedCountry(null);
        setCountries([]);
        setShowDropdown(false);
        setError(null);
        if (onSelectCountry) {
            onSelectCountry(null);
        }
    };

    return (
        <div className="country-search" ref={searchRef}>
            <div className="search-input-wrapper">
                <FaSearch className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.length >= 2 && countries.length > 0 && setShowDropdown(true)}
                />
                {loading && <FaSpinner className="loading-spinner" />}
                {searchTerm && !loading && (
                    <button className="clear-btn" onClick={handleClear}>
                        <FaTimes />
                    </button>
                )}
            </div>

            {/* Información del país seleccionado */}
            {selectedCountry && !showDropdown && (
                <div className="selected-country-info">
                    <img src={selectedCountry.flag} alt={selectedCountry.name} className="country-flag-small" />
                    <div className="country-details">
                        <span className="country-name">{selectedCountry.name}</span>
                        <span className="country-code">CCA3: {selectedCountry.cca3}</span>
                    </div>
                </div>
            )}

            {/* Dropdown de resultados */}
            {showDropdown && (
                <div className="search-dropdown">
                    {error && (
                        <div className="search-error">
                            <FaGlobe />
                            <span>{error}</span>
                        </div>
                    )}

                    {!loading && !error && countries.length === 0 && searchTerm.length >= 2 && (
                        <div className="search-empty">
                            No se encontraron países
                        </div>
                    )}

                    {countries.length > 0 && (
                        <div className="countries-list">
                            {countries.map((country, index) => (
                                <div
                                    key={`${country.cca3}-${index}`}
                                    className="country-item"
                                    onClick={() => handleSelectCountry(country)}
                                >
                                    <img src={country.flag} alt={country.name} className="country-flag" />
                                    <div className="country-info">
                                        <div className="country-name-row">
                                            <span className="country-name">{country.name}</span>
                                            <span className="cioc-badge">{country.cca3}</span>
                                        </div>
                                        <div className="country-meta">
                                            <span className="country-region">{country.region}</span>
                                            <span className="country-capital">• {country.capital}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CountrySearch;