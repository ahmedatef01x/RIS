import React from "react";
import { Button } from "@/components/ui/button";

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<{}, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error("Uncaught error in component tree:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <h2 className="text-xl font-bold">حدث خطأ</h2>
          <p className="mt-2 text-muted-foreground">حصل خطأ أثناء عرض الصفحة. الرجاء إعادة تحميل الصفحة.</p>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()}>إعادة تحميل</Button>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
